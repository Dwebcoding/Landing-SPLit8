const nodemailer = require('nodemailer');

const REQUIRED_FIELDS = {
  studio: ['nome', 'email', 'telefono', 'indirizzo', 'tipo', 'urgenza'],
  tecnico: ['nome', 'email', 'telefono', 'regione', 'professione', 'esperienza']
};

const FORM_LABELS = {
  studio: 'Richiesta sopralluogo',
  tecnico: 'Candidatura tecnico'
};

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 5);
const MIN_FORM_FILL_MS = Number(process.env.MIN_FORM_FILL_MS || 3000);
const ipRequestStore = new Map();

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeText(value, maxLength = 2000) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeBody(body = {}) {
  const formType = typeof body.formType === 'string' ? body.formType.trim().toLowerCase() : '';
  const rawData = body.data && typeof body.data === 'object' ? body.data : {};

  const data = Object.fromEntries(
    Object.entries(rawData).map(([key, value]) => [key, sanitizeText(value, key === 'note' ? 4000 : 500)])
  );

  return {
    formType,
    submittedAt: typeof body.submittedAt === 'string' ? body.submittedAt : new Date().toISOString(),
    data
  };
}

function validatePayload(payload) {
  if (!REQUIRED_FIELDS[payload.formType]) {
    return 'Tipo form non supportato.';
  }

  if (payload.data.website) {
    return 'Richiesta non valida.';
  }

  const startedAt = payload.data.formStartedAt ? new Date(payload.data.formStartedAt).getTime() : 0;
  const submittedAt = new Date(payload.submittedAt).getTime();
  if (startedAt && submittedAt && submittedAt - startedAt < MIN_FORM_FILL_MS) {
    return 'Invio troppo rapido. Riprova tra qualche secondo.';
  }

  const missingField = REQUIRED_FIELDS[payload.formType].find((field) => !payload.data[field]);
  if (missingField) {
    return `Campo obbligatorio mancante: ${missingField}.`;
  }

  if (!isValidEmail(payload.data.email)) {
    return 'Email non valida.';
  }

  if (payload.formType === 'tecnico' && Number(payload.data.esperienza) < 0) {
    return 'Anni di esperienza non validi.';
  }

  return null;
}

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ipAddress) {
  const now = Date.now();
  const recent = (ipRequestStore.get(ipAddress) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    ipRequestStore.set(ipAddress, recent);
    return false;
  }

  recent.push(now);
  ipRequestStore.set(ipAddress, recent);
  return true;
}

function getAllowedOrigin() {
  return process.env.CORS_ALLOWED_ORIGIN || '*';
}

function getEmailConfig() {
  const port = Number(process.env.SMTP_PORT || 587);

  return {
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE || port === 465).toLowerCase() === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  };
}

function hasEmailTransportConfig() {
  const config = getEmailConfig();
  return Boolean(config.host && config.port);
}

async function sendLeadEmail(payload) {
  if (!hasEmailTransportConfig()) {
    return { emailed: false, reason: 'smtp_not_configured' };
  }

  const transporter = nodemailer.createTransport(getEmailConfig());
  const to = process.env.LEADS_TO_EMAIL;
  const from = process.env.LEADS_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
  const replyTo = payload.data.email;

  if (!to || !from) {
    throw new Error('Configurazione email incompleta: LEADS_TO_EMAIL o LEADS_FROM_EMAIL mancanti.');
  }

  const visibleEntries = Object.entries(payload.data).filter(([key]) => !['website', 'formStartedAt'].includes(key));
  const subject = `[SPLit8] ${FORM_LABELS[payload.formType]} - ${payload.data.nome}`;
  const text = [
    `${FORM_LABELS[payload.formType]}`,
    `Ricevuto il: ${payload.submittedAt}`,
    '',
    ...visibleEntries.map(([key, value]) => `${key}: ${value || '-'}`)
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
      <h2 style="margin-bottom:12px;">${escapeHtml(FORM_LABELS[payload.formType])}</h2>
      <p><strong>Ricevuto il:</strong> ${escapeHtml(payload.submittedAt)}</p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px;">
        <tbody>
          ${visibleEntries.map(([key, value]) => `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;background:#f7f7f7;width:180px;"><strong>${escapeHtml(key)}</strong></td>
              <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(value || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  await transporter.sendMail({
    to,
    from,
    replyTo,
    subject,
    text,
    html
  });

  return { emailed: true };
}

async function forwardToWebhook(payload) {
  const webhookUrl = process.env.FORM_WEBHOOK_URL;
  if (!webhookUrl) {
    return { forwarded: false };
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!webhookResponse.ok) {
    throw new Error(`Webhook non raggiungibile: ${webhookResponse.status}`);
  }

  return { forwarded: true };
}

module.exports = async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', getAllowedOrigin());
  response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Metodo non consentito.' });
  }

  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp)) {
    return sendJson(response, 429, { error: 'Troppi invii ravvicinati. Riprova più tardi.' });
  }

  try {
    const payload = normalizeBody(request.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return sendJson(response, 400, { error: validationError });
    }

    console.log('Nuova submission SPLit8:', JSON.stringify({
      formType: payload.formType,
      submittedAt: payload.submittedAt,
      email: payload.data.email,
      nome: payload.data.nome
    }));

    const [emailResult, webhookResult] = await Promise.all([
      sendLeadEmail(payload),
      forwardToWebhook(payload)
    ]);

    return sendJson(response, 200, {
      ok: true,
      message: 'Richiesta ricevuta correttamente.',
      ...emailResult,
      ...webhookResult
    });
  } catch (error) {
    console.error('Errore submit form SPLit8:', error);
    return sendJson(response, 500, {
      error: 'Errore interno durante la gestione della richiesta.'
    });
  }
};