// One-off diagnostic for the Nimiq Pay Mini App provider. Served at
// /miniapp-probe and meant to be opened inside Nimiq Pay:
//
//   https://nimpay.app/miniapps/open/nimiq.cafe/miniapp-probe
//   nimiqpay://miniapp?url=nimiq.cafe/miniapp-probe
//
// It answers one question that cannot be answered by reading the SDK: does the
// signature from the injected provider's sign() verify against the same
// HubApi.MSG_PREFIX scheme that /api/auth/sign-in already uses? The signing
// happens natively inside Nimiq Pay, so the prefix is not visible in
// @nimiq/mini-app-sdk's JavaScript.
//
// The page has to be same-origin: app.js only allows CORS from
// http://localhost:8080, so a page hosted anywhere else could not post to
// /api/auth/sign-in at all.
//
// Delete this file and its route once the question is settled.

// The exact string the production sign-in signs, so a pass here means the
// real flow would pass too (client/src/auth/view/nimiq/nimiq-sign-in-view.tsx).
const SIGN_IN_MESSAGE =
    "Welcome to NimiqCafe!\n\nSign in to continue. This verification process is free and doesn't involve any blockchain transactions or access to your sensitive information like passwords or private keys.";

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Mini App provider probe</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 16px 14px 48px;
    background: #14171f; color: #e8ecf4;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #8b95a8; font-size: 13px; margin: 0 0 18px; }
  button {
    width: 100%; padding: 14px; margin-bottom: 14px;
    font: 600 16px/1 inherit; color: #08131f;
    background: #1ee0a0; border: 0; border-radius: 10px;
  }
  button:disabled { opacity: .5; }
  button.secondary { background: #2a3242; color: #e8ecf4; }
  .step {
    border: 1px solid #262d3b; border-radius: 10px;
    padding: 11px 12px; margin-bottom: 9px; background: #191d27;
  }
  .step h2 { font-size: 13px; margin: 0 0 5px; letter-spacing: .04em; text-transform: uppercase; color: #8b95a8; }
  .v { font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; white-space: pre-wrap; }
  .ok { color: #1ee0a0; } .bad { color: #ff6b6b; } .warn { color: #ffc44d; } .dim { color: #8b95a8; }
  textarea {
    width: 100%; height: 190px; margin-top: 6px; padding: 10px;
    background: #0e1117; color: #cfd6e4; border: 1px solid #262d3b; border-radius: 8px;
    font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
</style>
</head>
<body>
<h1>Mini App provider probe</h1>
<p class="sub">Open this inside Nimiq Pay. It signs the real sign-in message and posts it to the live <code>/api/auth/sign-in</code>, so a pass means the production flow would pass.</p>

<button id="run">Run probe</button>
<div id="out"></div>
<button id="copy" class="secondary" hidden>Copy results</button>
<textarea id="raw" hidden readonly></textarea>

<script>
const MESSAGE = ${JSON.stringify(SIGN_IN_MESSAGE)};
const log = [];
const out = document.getElementById('out');

function step(title, value, cls = '') {
  const el = document.createElement('div');
  el.className = 'step';
  el.innerHTML = '<h2></h2><div class="v"></div>';
  el.querySelector('h2').textContent = title;
  const v = el.querySelector('.v');
  v.textContent = value;
  if (cls) v.classList.add(cls);
  out.appendChild(el);
  log.push(title + ': ' + value);
  return el;
}

// --- encoding helpers -------------------------------------------------------
const isHex = (s) => typeof s === 'string' && s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s);
const hexToBytes = (s) => Uint8Array.from(s.match(/.{2}/g).map((b) => parseInt(b, 16)));
const bytesToB64 = (b) => btoa(String.fromCharCode(...b));
const b64urlToB64 = (s) => s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);

function describe(name, value) {
  if (typeof value !== 'string') return name + ' is ' + typeof value + ': ' + JSON.stringify(value);
  const guess = isHex(value) ? 'hex (' + value.length / 2 + ' bytes)'
    : /^[A-Za-z0-9+/]+=*$/.test(value) ? 'base64'
    : /^[A-Za-z0-9\\-_]+=*$/.test(value) ? 'base64url' : 'unknown';
  return name + ': ' + value.length + ' chars, looks like ' + guess + '\\n' + value;
}

// The server expects base64 of raw bytes. We do not know which encoding the
// provider returns, so try each reading and let the server arbitrate.
function candidates(value) {
  const list = [];
  if (isHex(value)) list.push(['hex -> base64', bytesToB64(hexToBytes(value))]);
  if (/^[A-Za-z0-9+/]+=*$/.test(value)) list.push(['already base64', value]);
  if (/^[A-Za-z0-9\\-_]+=*$/.test(value) && /[-_]/.test(value)) list.push(['base64url -> base64', b64urlToB64(value)]);
  return list;
}

async function waitForProvider(timeoutMs = 6000) {
  const start = Date.now();
  while (!window.nimiq) {
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.nimiq;
}

document.getElementById('run').onclick = async () => {
  const btn = document.getElementById('run');
  btn.disabled = true;
  btn.textContent = 'Running...';
  out.innerHTML = '';
  log.length = 0;

  try {
    // 1 -- what the host injected
    step('1. Host objects',
      'window.nimiq: ' + (window.nimiq ? 'present' : 'absent') +
      '\\nwindow.nimiqPay: ' + (window.nimiqPay ? 'present' : 'absent') +
      '\\nwindow.ethereum: ' + (window.ethereum ? 'present' : 'absent') +
      '\\nhost language: ' + (window.nimiqPay && window.nimiqPay.language || 'n/a') +
      '\\nUA: ' + navigator.userAgent,
      window.nimiq ? 'ok' : 'bad');

    const nimiq = await waitForProvider();
    if (!nimiq) {
      step('Stopped', 'window.nimiq never appeared. This page is not running inside Nimiq Pay, so there is nothing to probe.', 'bad');
      return;
    }

    // 2 -- connect + accounts
    try { await nimiq.connect(); } catch (e) { step('2a. connect() threw', String(e && e.message || e), 'warn'); }
    const accounts = await nimiq.listAccounts();
    if (!Array.isArray(accounts) || !accounts.length) {
      step('2. listAccounts()', 'No accounts returned: ' + JSON.stringify(accounts), 'bad');
      return;
    }
    const signer = accounts[0];
    step('2. listAccounts()', accounts.length + ' account(s)\\nusing: ' + signer, 'ok');

    // 3 -- sign the production message
    const signed = await nimiq.sign(MESSAGE);
    if (!signed || signed.error) {
      step('3. sign()', 'Failed: ' + JSON.stringify(signed), 'bad');
      return;
    }
    step('3. sign() returned', Object.keys(signed).join(', '), 'ok');
    step('3a. publicKey', describe('publicKey', signed.publicKey));
    step('3b. signature', describe('signature', signed.signature));

    // 4 -- does it verify against the existing endpoint?
    const pkOptions = candidates(signed.publicKey);
    const sigOptions = candidates(signed.signature);
    if (!pkOptions.length || !sigOptions.length) {
      step('4. Cannot encode', 'Unrecognised encoding; nothing to post.', 'bad');
      return;
    }

    let passed = null;
    const tried = [];
    for (const [pkLabel, base64SignerPublicKey] of pkOptions) {
      for (const [sigLabel, base64Signature] of sigOptions) {
        const label = pkLabel + ' / ' + sigLabel;
        let line;
        try {
          const res = await fetch('/api/auth/sign-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: MESSAGE, base64Signature, base64SignerPublicKey, signer }),
          });
          const body = await res.json().catch(() => ({}));
          line = label + ' -> HTTP ' + res.status +
            (body.accessToken ? ' ACCEPTED (token ' + body.accessToken.length + ' chars)'
                              : ' ' + (body.message || JSON.stringify(body)));
          if (res.ok && body.accessToken) passed = label;
        } catch (e) {
          line = label + ' -> request failed: ' + String(e && e.message || e);
        }
        tried.push(line);
      }
    }
    step('4. POST /api/auth/sign-in', tried.join('\\n'), passed ? 'ok' : 'bad');

    // 5 -- the verdict
    step('5. Verdict',
      passed
        ? 'PASS. Nimiq Pay signs with the same HubApi.MSG_PREFIX scheme the server\\nalready verifies. Winning encoding: ' + passed + '\\nThe existing /api/auth/sign-in needs no change; the client only has to\\nswap HubApi.signMessage() for provider.sign() + listAccounts().'
        : 'FAIL. Every encoding was rejected. The signature itself is well-formed\\n(see 3a/3b), so the likely cause is a different message prefix inside\\nNimiq Pay. The server would then need a second verify path alongside\\nHubApi.MSG_PREFIX. Send the values above back to compare.',
      passed ? 'ok' : 'warn');
  } catch (err) {
    step('Unexpected error', String(err && err.stack || err), 'bad');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run probe again';
    const raw = document.getElementById('raw');
    raw.value = log.join('\\n\\n');
    raw.hidden = false;
    document.getElementById('copy').hidden = false;
  }
};

document.getElementById('copy').onclick = async () => {
  const raw = document.getElementById('raw');
  try {
    await navigator.clipboard.writeText(raw.value);
    document.getElementById('copy').textContent = 'Copied';
  } catch {
    raw.select();
    document.getElementById('copy').textContent = 'Select the text above and copy';
  }
};
</script>
</body>
</html>`;

module.exports = { PAGE, SIGN_IN_MESSAGE };
