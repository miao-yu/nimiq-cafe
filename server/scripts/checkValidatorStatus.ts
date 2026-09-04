// Watches the NimiqCafe validator and emails a warning when it stops being
// healthy -- dropped out of the elected set, flagged inactive, jailed, retired,
// or unreachable because the node itself is down or stuck.
//
// Meant to run from cron every few minutes. Unlike the store* jobs this one
// cd's into server/ first, because winston writes logs/ relative to the working
// directory and cron would otherwise scatter them into root's home:
//
//   2-59/5 * * * * cd /var/www/nimiq-cafe-prod/server && /usr/bin/node scripts/checkValidatorStatus.js >> /var/log/nimiq-validator-check.log 2>&1
//
// A single check is not trusted on its own. Every observed false alarm was one
// bad sample at exactly 00:00 UTC, when logrotate and the top-of-the-hour cron
// jobs make the node answer slowly: the RPC call timed out, an alert went out,
// and the next run five minutes later reported "healthy again". So a verdict
// only becomes an email after ALERT_CONFIRMATIONS consecutive checks agree,
// in both directions -- alert and recovery. Offsetting the cron schedule off
// the top of the hour keeps the check away from that pile-up in the first place.
//
// Flags:
//   --dry-run  run the checks, print the verdict, send nothing, write no state
//   --force    send the alert now, skipping the confirmation window and the
//              "already reported" check
//   --test     send a sample alert to prove the Resend wiring works, then exit
//
// Env (server/.env): RESEND_API_KEY, RESEND_FROM_EMAIL, ALERT_EMAIL_TO,
// optionally VALIDATOR_ADDRESS, ALERT_REPEAT_HOURS, ALERT_CONFIRMATIONS and
// RPC_TIMEOUT_MS.

import { config } from 'dotenv';

config({ path: __dirname + '/../.env' });

import { readFileSync, writeFileSync } from 'fs';
import logger from '../logger';
import { isConfigured, messageHtml, sendEmail } from '../emailer';

// Overridable so the script can be pointed at an ssh-forwarded node for testing.
const JSON_RPC_URL = process.env.NIMIQ_RPC_URL ?? 'http://127.0.0.1:8648';

// Generous, because a timeout here is indistinguishable from a dead node and
// getValidators walks the whole staking contract. The node normally answers in
// well under a second; 10s was still short enough to trip on a busy minute.
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS ?? 30000);

// Same validator app.js serves as the featured pool.
const VALIDATOR_ADDRESS = process.env.VALIDATOR_ADDRESS ?? 'NQ83 4MVH 53Q4 AL3B Q097 55GJ LUQ3 GSF0 85B7';

const STATE_FILE = __dirname + '/../json/validator-alert-state.json';

// Nimiq produces a block per second, so a head this old means the node is
// stuck or syncing and every other answer it gives is stale.
const HEAD_STALE_MS = 5 * 60 * 1000;

// While a problem persists, re-send this often so an alert cannot be lost to a
// single missed email.
const REPEAT_HOURS = Number(process.env.ALERT_REPEAT_HOURS ?? 6);

// How many consecutive checks must agree before an email goes out. At the */5
// cron schedule 3 checks is a ~10 minute window -- long enough to ride out the
// blips that produced every false alarm so far, and nothing next to the ~12
// hours of rewards a genuinely missed election costs.
const CONFIRMATIONS = Math.max(1, Number(process.env.ALERT_CONFIRMATIONS ?? 3));

const POOL_URL = `https://nimiq.cafe/pools/${encodeURIComponent(VALIDATOR_ADDRESS)}`;

interface Validator {
  address: string;
  balance: number;
  numStakers: number;
  inactivityFlag: number | null;
  retired: boolean;
  jailedFrom: number | null;
}

interface Slot {
  validator: string;
  numSlots: number;
}

interface Block {
  number: number;
  timestamp: number;
  slots?: Slot[];
}

interface Problem {
  code: string;
  detail: string;
}

interface AlertState {
  status: 'ok' | 'alert';
  // Codes reported in the last alert email.
  problemCodes: string[];
  // When the current run of problems was first seen, which is earlier than the
  // alert itself by the length of the confirmation window.
  since: string;
  lastNotifiedAt: string | null;
  // Consecutive checks that found problems / found none. Only one of the two is
  // ever non-zero. `failures` deliberately survives the codes changing, so a
  // node flapping between two different errors still trips the alert.
  failures: number;
  clears: number;
  // The codes from the most recent failing check and how many checks in a row
  // reported exactly that set. Tracked separately from `failures` because a
  // changed code set mid-incident needs confirming on its own before it earns
  // another email.
  seenCodes: string[];
  seenStreak: number;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(JSON_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${method} returned HTTP ${response.status}`);
  }

  const payload = await response.json() as { result?: { data: T }; error?: { message?: string } };

  if (payload.error) {
    throw new Error(`${method} failed: ${payload.error.message ?? JSON.stringify(payload.error)}`);
  }

  if (!payload.result) {
    throw new Error(`${method} returned no result`);
  }

  return payload.result.data;
}

function fNim(luna: number): string {
  return `${Math.round(luna / 100000).toLocaleString('en-US')} NIM`;
}

function readState(): AlertState {
  const fresh: AlertState = {
    status: 'ok',
    problemCodes: [],
    since: new Date().toISOString(),
    lastNotifiedAt: null,
    failures: 0,
    clears: 0,
    seenCodes: [],
    seenStreak: 0,
  };

  try {
    // Spread over the defaults so a state file written before the confirmation
    // counters existed still parses, rather than starting the streaks at NaN.
    return { ...fresh, ...JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as Partial<AlertState> };
  } catch {
    // No state file yet, or it was hand-edited into something unparseable.
    // Starting from "ok" only risks one duplicate alert.
    return fresh;
  }
}

function writeState(state: AlertState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sameProblems(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}

async function collect(): Promise<{ problems: Problem[]; facts: [string, string][] }> {
  const problems: Problem[] = [];
  const facts: [string, string][] = [['Validator', VALIDATOR_ADDRESS]];

  let head: Block;
  let epochNumber: number;

  try {
    const blockNumber = await rpc<number>('getBlockNumber');
    head = await rpc<Block>('getBlockByNumber', [blockNumber, false]);
    epochNumber = await rpc<number>('getEpochNumber');
  } catch (error: any) {
    // Nothing else can be trusted without the node, so this is the whole report.
    return {
      problems: [{ code: 'rpc-unreachable', detail: `The Nimiq node at ${JSON_RPC_URL} did not answer: ${error.message}` }],
      facts,
    };
  }

  facts.push(['Head block', `#${head.number.toLocaleString('en-US')}`]);
  facts.push(['Epoch', String(epochNumber)]);

  const headAgeMs = Date.now() - head.timestamp;
  if (headAgeMs > HEAD_STALE_MS) {
    problems.push({
      code: 'node-stale',
      detail: `The node's head block is ${Math.round(headAgeMs / 60000)} minutes old, so it is stuck or still syncing.`,
    });
  }

  // Slot allocation for the current epoch, read exactly the way /api/pools
  // computes isElected in app.js.
  try {
    const electionBlockNumber = await rpc<number>('getElectionBlockOf', [epochNumber - 1]);
    const electionBlock = await rpc<Block>('getBlockByNumber', [electionBlockNumber, false]);
    const slots = electionBlock.slots ?? [];
    const numSlots = slots.find(slot => slot.validator === VALIDATOR_ADDRESS)?.numSlots ?? 0;

    facts.push(['Slots this epoch', `${numSlots} of ${slots.reduce((sum, slot) => sum + slot.numSlots, 0)}`]);

    if (numSlots === 0) {
      problems.push({
        code: 'not-elected',
        detail: `The validator holds no validator slots in epoch ${epochNumber}, so it is not producing blocks and earns nothing this epoch.`,
      });
    }
  } catch (error: any) {
    problems.push({ code: 'election-unreadable', detail: `Could not read the election slots: ${error.message}` });
  }

  // Staking-contract state: the flags that explain why an election was missed.
  try {
    const validators = await rpc<Validator[]>('getValidators');
    const validator = validators.find(entry => entry.address === VALIDATOR_ADDRESS);

    if (!validator) {
      problems.push({
        code: 'missing',
        detail: 'The validator is not in the staking contract at all -- it was deleted, or the address is wrong.',
      });
      return { problems, facts };
    }

    facts.push(['Stake', fNim(validator.balance)]);
    facts.push(['Stakers', String(validator.numStakers)]);

    if (validator.inactivityFlag !== null) {
      problems.push({
        code: 'inactive',
        detail: `The validator was marked inactive at block #${validator.inactivityFlag.toLocaleString('en-US')} and will not be elected until it is reactivated.`,
      });
    }

    if (validator.jailedFrom !== null) {
      problems.push({
        code: 'jailed',
        detail: `The validator was jailed at block #${validator.jailedFrom.toLocaleString('en-US')}, usually for double-signing or prolonged downtime.`,
      });
    }

    if (validator.retired) {
      problems.push({ code: 'retired', detail: 'The validator is retired and can no longer be elected.' });
    }
  } catch (error: any) {
    problems.push({ code: 'validators-unreadable', detail: `Could not read the validator list: ${error.message}` });
  }

  return { problems, facts };
}

(async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (!isConfigured() && !dryRun) {
    logger.error('checkValidatorStatus: Resend is not configured (RESEND_API_KEY, RESEND_FROM_EMAIL, ALERT_EMAIL_TO)');
    process.exit(1);
  }

  if (args.includes('--test')) {
    const id = await sendEmail(
      'NimiqCafe validator monitor: test email',
      messageHtml(
        'Test email',
        '<p>The validator monitor can reach Resend. This is not a real alert.</p>',
        [['Validator', VALIDATOR_ADDRESS], ['Sent at', new Date().toISOString()]],
        POOL_URL,
        'Open the pool page',
      ),
    );
    logger.info(`checkValidatorStatus: test email sent (${id})`);
    return;
  }

  const { problems, facts } = await collect();
  const codes = problems.map(problem => problem.code);

  if (dryRun) {
    facts.forEach(([label, value]) => logger.info(`  ${label}: ${value}`));
  }

  const state = readState();
  const now = new Date();

  if (problems.length === 0) {
    logger.info('checkValidatorStatus: healthy');

    if (dryRun) {
      return;
    }

    const clears = state.clears + 1;
    const streaks = { failures: 0, clears, seenCodes: [], seenStreak: 0 };

    // Only worth an email if it is news -- i.e. we had warned about something.
    if (state.status === 'alert') {
      // One clean read is not proof: it can just as easily be the flaky minute
      // ending as the problem being fixed. Wait for the same number of agreeing
      // checks the alert itself needed.
      if (!force && clears < CONFIRMATIONS) {
        logger.info(`checkValidatorStatus: clean check ${clears}/${CONFIRMATIONS}, waiting before calling it recovered`);
        writeState({ ...state, ...streaks });
        return;
      }

      // Persist the streak before sending. If Resend is down the send throws and
      // the run dies here, and a lost write would leave the counters frozen at
      // whatever the last surviving run recorded -- the streaks would then never
      // reflect what the checks actually saw. Status stays 'alert' until the
      // email is really out, so the next clean check retries the send.
      writeState({ ...state, ...streaks });

      await sendEmail(
        'NimiqCafe validator recovered',
        messageHtml(
          'Validator is healthy again',
          `<p>The problems reported since ${state.since} are gone: ${state.problemCodes.join(', ')}.</p>`,
          facts,
          POOL_URL,
          'Open the pool page',
        ),
      );
      logger.info('checkValidatorStatus: recovery email sent');
    } else if (state.failures > 0) {
      logger.info(`checkValidatorStatus: unconfirmed problems cleared (${state.seenCodes.join(', ')}), no email sent`);
    }

    writeState({ status: 'ok', problemCodes: [], since: now.toISOString(), lastNotifiedAt: null, ...streaks });
    return;
  }

  logger.warn(`checkValidatorStatus: ${codes.join(', ')}`);
  problems.forEach(problem => logger.warn(`  ${problem.code}: ${problem.detail}`));

  if (dryRun) {
    return;
  }

  const failures = state.failures + 1;
  const seenStreak = sameProblems(codes, state.seenCodes) ? state.seenStreak + 1 : 1;
  // The streak, not this check, dates the problem: the first sighting is what
  // the reader wants to know, and it is CONFIRMATIONS checks before the email.
  const since = failures === 1 ? now.toISOString() : state.since;
  const streaks = { since, failures, clears: 0, seenCodes: codes, seenStreak };

  // The node is briefly unreadable at the top of the hour often enough that a
  // single bad check means nothing. Record it and decide next time.
  if (!force && state.status !== 'alert' && failures < CONFIRMATIONS) {
    logger.info(`checkValidatorStatus: problems on check ${failures}/${CONFIRMATIONS}, waiting for confirmation before emailing`);
    writeState({ ...state, ...streaks, status: 'ok' });
    return;
  }

  const changed = state.status === 'alert' && !sameProblems(codes, state.problemCodes);

  // Mid-incident the codes drift -- a timeout lands on top of a real problem and
  // then clears. That is the same unreliable single sample as above, so the new
  // set has to hold for the confirmation window before it earns its own email.
  if (!force && changed && seenStreak < CONFIRMATIONS) {
    logger.info(`checkValidatorStatus: codes changed to ${codes.join(', ')} on check ${seenStreak}/${CONFIRMATIONS}, not re-alerting yet`);
    writeState({ ...state, ...streaks });
    return;
  }

  const isNew = state.status !== 'alert' || changed;
  const lastNotifiedMs = state.lastNotifiedAt ? Date.parse(state.lastNotifiedAt) : 0;
  const isDue = now.getTime() - lastNotifiedMs >= REPEAT_HOURS * 60 * 60 * 1000;

  // A validator can sit not-elected for hours; re-sending every five minutes
  // would train us to ignore the alert.
  if (!force && !isNew && !isDue) {
    logger.info('checkValidatorStatus: same problems already reported, staying quiet');
    writeState({ ...state, ...streaks });
    return;
  }

  // Same reasoning as the recovery send: bank the streak first, and leave
  // lastNotifiedAt alone until the email is actually accepted so a failed send
  // is retried rather than treated as delivered.
  writeState({ ...state, ...streaks, status: 'alert', problemCodes: codes });

  await sendEmail(
    `NimiqCafe validator alert: ${codes.join(', ')}`,
    messageHtml(
      'Validator needs attention',
      `<ul>${problems.map(problem => `<li><strong>${problem.code}</strong> &mdash; ${problem.detail}</li>`).join('')}</ul>`,
      [...facts, ['Problem since', since], ['Confirmed over', `${failures} consecutive checks`], ['Checked at', now.toISOString()]],
      POOL_URL,
      'Open the pool page',
    ),
  );

  logger.info('checkValidatorStatus: alert email sent');
  writeState({ ...state, ...streaks, status: 'alert', problemCodes: codes, lastNotifiedAt: now.toISOString() });
})().catch((error: any) => {
  logger.error(`checkValidatorStatus: ${error.stack ?? error.message}`);
  process.exit(1);
});
