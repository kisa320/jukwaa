# Jukwaa

Demo web app: swipe through Kenyan live creators (Music, Comedy, Fitness), pay with M-Pesa to unblur and join a live show, tip creators, buy perks, and check each creator's trust score and show history.

**Demo only:** creators, viewers, chat and M-Pesa payments are simulated. Data is stored in browser localStorage.

## Run
```
python3 -m http.server 8080
```
Then open http://localhost:8080 (or just open `index.html`).

## Next steps for production
- Real M-Pesa Daraja STK Push + callback
- Backend accounts, creator ID/age verification, moderation
- Real live video (e.g. WebRTC/LiveKit) and signed, watermarked media URLs
