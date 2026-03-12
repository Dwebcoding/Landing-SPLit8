import handler from '../api/submit.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    }
  };
}

const request = {
  method: 'POST',
  headers: {},
  socket: { remoteAddress: '127.0.0.1' },
  body: {
    formType: 'studio',
    submittedAt: new Date(Date.now() + 5000).toISOString(),
    data: {
      formStartedAt: new Date().toISOString(),
      website: '',
      nome: 'Studio Rossi',
      email: 'info@studiorossi.it',
      telefono: '+39 333 1234567',
      indirizzo: 'Via Roma 1, Milano',
      tipo: 'rilievo',
      urgenza: 'media',
      note: 'Test smoke locale'
    }
  }
};

const response = createMockResponse();
await handler(request, response);

console.log(JSON.stringify({
  statusCode: response.statusCode,
  body: response.body
}, null, 2));