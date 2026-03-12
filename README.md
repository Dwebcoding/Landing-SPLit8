# Landing SPLit8

Landing page con form collegati a una Vercel Function che valida i dati, protegge da spam base e invia i lead via email SMTP.

## Stato attuale

- la pagina principale e `index.html`
- i form inviano a `POST /api/submit`
- il backend valida i campi richiesti
- e presente protezione base con honeypot, tempo minimo di compilazione e rate limit per IP
- i lead possono essere inviati via email SMTP
- in parallelo possono essere inoltrati a un webhook con `FORM_WEBHOOK_URL`

## File principali

- `index.html`: landing e form
- `js/landing.js`: validazione frontend e invio `fetch`
- `api/submit.js`: validazione backend, email, webhook, anti-spam
- `.env.example`: tutte le variabili configurabili
- `vercel.json`: configurazione runtime funzione

## Setup locale

1. installa le dipendenze
2. copia `.env.example` in `.env.local`
3. compila le variabili SMTP e l'email destinataria lead
4. avvia in locale con Vercel oppure testa l'handler con lo smoke test

Comandi utili:

```bash
npm install
npm run check:api
npm run check:frontend
npm run smoke:api
```

Per sviluppo completo con funzione serverless locale:

```bash
npx vercel dev
```

## Variabili ambiente

### Email SMTP

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `LEADS_TO_EMAIL`
- `LEADS_FROM_EMAIL`

### Opzionali

- `FORM_WEBHOOK_URL`: inoltro dei lead a Make, Zapier, Slack webhook o CRM custom
- `CORS_ALLOWED_ORIGIN`: origine permessa, utile se frontend e backend vivono su domini diversi
- `RATE_LIMIT_WINDOW_MS`: finestra rate limiting
- `RATE_LIMIT_MAX`: numero massimo invii per IP nella finestra
- `MIN_FORM_FILL_MS`: tempo minimo di compilazione accettato

## Deploy su Vercel

1. importa la repository `Dwebcoding/Landing-SPLit8` in Vercel
2. lascia framework preset su `Other`
3. non serve build command
4. aggiungi in Vercel tutte le variabili di `.env.example`
5. fai deploy
6. testa entrambi i form su URL di preview e poi in produzione

## Endpoint backend

- `POST /api/submit`

Payload esempio:

```json
{
  "formType": "studio",
  "submittedAt": "2026-03-12T10:00:00.000Z",
  "data": {
    "formStartedAt": "2026-03-12T09:59:50.000Z",
    "website": "",
    "nome": "Studio Rossi",
    "email": "info@studiorossi.it",
    "telefono": "+39 000 0000000",
    "indirizzo": "Via Roma 1, Milano",
    "tipo": "rilievo",
    "urgenza": "media",
    "note": "Accesso dalle 9 alle 12"
  }
}
```

## Cosa manca per andare live davvero

- configurare un provider SMTP reale: Brevo, Gmail Workspace, Mailgun SMTP o simili
- impostare l'email che riceve i lead
- testare almeno un invio studio e uno tecnico in ambiente Vercel
- decidere se vuoi solo email o anche salvataggio in CRM/database
- aggiungere reCAPTCHA o Cloudflare Turnstile se il traffico cresce

## Consiglio operativo

Per partire subito e vendere l'idea, il setup minimo serio e:

1. Vercel per hosting e API
2. SMTP Brevo o Gmail Workspace per ricevere lead via email
3. webhook Make o Zapier per salvare automaticamente su Google Sheets o Airtable

Con questa combinazione puoi iniziare subito senza costruire ancora un backend complesso con database e dashboard.