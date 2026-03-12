# Landing SPLit8

Landing page statica con form collegati a una Vercel Function.

## Cosa fa

- serve la pagina principale da `landing.html`
- espone `POST /api/submit` per i due form
- valida i dati lato backend
- logga le richieste su Vercel
- inoltra opzionalmente i lead a un webhook tramite `FORM_WEBHOOK_URL`

## Deploy su Vercel

1. importa la repository `Dwebcoding/Landing-SPLit8` in Vercel
2. lascia rilevamento framework su `Other`
3. non serve build command
4. non serve output directory
5. pubblica il progetto

## Variabili ambiente opzionali

- `FORM_WEBHOOK_URL`: URL webhook per inoltrare automaticamente i lead a Slack, Make, Zapier o altro backend

## Endpoint backend

- `POST /api/submit`

Payload esempio:

```json
{
  "formType": "studio",
  "submittedAt": "2026-03-12T10:00:00.000Z",
  "data": {
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

## Nota pratica

Senza `FORM_WEBHOOK_URL` i form funzionano comunque, ma i dati restano nei log della function su Vercel. Se vuoi vera operatività, il passo successivo corretto è collegare un webhook o un provider email/CRM.