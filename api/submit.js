const REQUIRED_FIELDS = {
  studio: ['nome', 'email', 'telefono', 'indirizzo', 'tipo', 'urgenza'],
  tecnico: ['nome', 'email', 'telefono', 'regione', 'professione', 'esperienza']
};

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeBody(body = {}) {
  const formType = typeof body.formType === 'string' ? body.formType.trim().toLowerCase() : '';
  const rawData = body.data && typeof body.data === 'object' ? body.data : {};

  const data = Object.fromEntries(
    Object.entries(rawData).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
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
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Metodo non consentito.' });
  }

  try {
    const payload = normalizeBody(request.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return sendJson(response, 400, { error: validationError });
    }

    console.log('Nuova submission SPLit8:', JSON.stringify(payload));

    const webhookResult = await forwardToWebhook(payload);

    return sendJson(response, 200, {
      ok: true,
      message: 'Richiesta ricevuta correttamente.',
      ...webhookResult
    });
  } catch (error) {
    console.error('Errore submit form SPLit8:', error);
    return sendJson(response, 500, {
      error: 'Errore interno durante la gestione della richiesta.'
    });
  }
};