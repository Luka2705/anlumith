import nodemailer from 'nodemailer';
import { firebaseCliAccessToken } from './firebase-metrics.js';

export async function createContactTransport({ projectId, getAccessToken = firebaseCliAccessToken, fetcher = fetch, createTransport = nodemailer.createTransport }) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId || '')) throw new Error('Invalid project');
  const token = await getAccessToken();
  async function secret(name) {
    const response = await fetcher(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${name}/versions/latest:access`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Email configuration unavailable');
    const value = await response.json();
    if (!value.payload?.data) throw new Error('Missing email configuration');
    return Buffer.from(value.payload.data, 'base64').toString('utf8');
  }
  const [user, pass] = await Promise.all([secret('EMAIL_USER'), secret('EMAIL_PASS')]);
  const transport = createTransport({ service: 'gmail', auth: { user, pass }, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000 });
  return {
    verify: () => transport.verify(),
    async send(inquiry) {
      const result = await transport.sendMail({ from: user, to: 'info@anlumith.com', replyTo: inquiry.email,
        subject: 'echo music — Investor deck request',
        text: `Name: ${inquiry.name}\nEmail: ${inquiry.email}\nOrganization: ${inquiry.organization}\nLanguage: ${inquiry.locale}\nPrivacy acknowledged: yes\n\n${inquiry.message}` });
      if (!result.accepted?.some(address => String(address).toLowerCase() === 'info@anlumith.com')) throw new Error('Email not accepted');
    },
  };
}

export async function sendContactMail({ projectId, inquiry }) {
  const transport = await createContactTransport({ projectId });
  await transport.send(inquiry);
}
