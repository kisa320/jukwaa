# Jukwaa

Demo web app: swipe through Kenyan live creators (Music, Comedy, Fitness), pay with M-Pesa to unblur and join a live show, tip creators, buy perks, and check each creator's trust score and show history.

**Demo only:** creators, viewers, chat and M-Pesa payments are simulated. Data is stored in browser localStorage.

## Run
```
python3 -m http.server 8080
```
Then open http://localhost:8080 (or just open `index.html`).

## Real M-Pesa (Daraja STK Push)
`server/` is a small Flask backend: `POST /mpesa/stkpush`, `POST /mpesa/callback`, `GET /mpesa/status/<id>`.

1. Create a Daraja app at https://developer.safaricom.co.ke (Lipa Na M-Pesa Sandbox) to get a Consumer Key/Secret.
2. Deploy `server/` (e.g. Render using `render.yaml`) with env vars `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_CALLBACK_URL=https://<your-app>/mpesa/callback` (sandbox shortcode/passkey are defaults; set `MPESA_ENV=production`, `MPESA_SHORTCODE`, `MPESA_PASSKEY` for live).
3. Set `window.JUKWAA_API` in `config.js` to the backend URL. Empty = simulated payments.

Note: payment status is kept in memory; use a database before going live.

## Next steps for production
- Backend accounts, creator ID/age verification, moderation
- Real live video (e.g. WebRTC/LiveKit) and signed, watermarked media URLs
