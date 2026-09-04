import { Resend } from 'resend';

// Resend wrapper, mirroring apps/api-app/src/modules/email/email.service.ts in
// scanmygroup.com: the client is only built when a key is present, so a missing
// RESEND_API_KEY degrades to "no email" instead of throwing.
//
// Env is read on every call rather than at module load: scripts call
// dotenv.config() themselves, and ES imports are hoisted above that call, so a
// module-level read would always see an empty environment under cron.

export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string[];
}

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY ?? '';
  const from = process.env.RESEND_FROM_EMAIL ?? '';
  const to = (process.env.ALERT_EMAIL_TO ?? '')
    .split(',')
    .map(address => address.trim())
    .filter(Boolean);

  if (!apiKey || !from || to.length === 0) {
    return null;
  }

  return { apiKey, from, to };
}

export function isConfigured(): boolean {
  return getEmailConfig() !== null;
}

// Resend returns { data, error } instead of throwing on API errors (unverified
// sender domain, revoked key). Swallowing that would leave an alerting script
// that reports success while sending nothing, so surface it as an exception.
export async function sendEmail(subject: string, html: string): Promise<string> {
  const config = getEmailConfig();

  if (!config) {
    throw new Error('Resend is not configured: set RESEND_API_KEY, RESEND_FROM_EMAIL and ALERT_EMAIL_TO');
  }

  const { data, error } = await new Resend(config.apiKey).emails.send({
    from: config.from,
    to: config.to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend rejected the email: ${error.name} - ${error.message}`);
  }

  return data?.id ?? 'unknown';
}

// `body` is raw HTML so callers can pass a list of problems, not just a
// sentence; `rows` becomes the label/value table underneath it.
export function messageHtml(title: string, body: string, rows: [string, string][], href: string, cta: string): string {
  const cells = rows
    .map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#637381">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`)
    .join('');

  return [
    `<h1>${title}</h1>`,
    body,
    `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">${cells}</table>`,
    `<p><a href="${href}">${cta}</a></p>`,
    '<p style="color:#919EAB;font-size:12px">Sent by checkValidatorStatus.js on the nimiq.cafe server.</p>',
  ].join('');
}
