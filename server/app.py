"""Jukwaa M-Pesa backend: Daraja STK Push (Lipa Na M-Pesa Online) + callback + status polling."""
import base64
import os
import time
from datetime import datetime

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

ENV = os.getenv("MPESA_ENV", "sandbox")
BASE = "https://sandbox.safaricom.co.ke" if ENV == "sandbox" else "https://api.safaricom.co.ke"
CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")  # Safaricom public sandbox shortcode
PASSKEY = os.getenv("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")  # public sandbox passkey
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")  # e.g. https://<your-app>.onrender.com/mpesa/callback
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = Flask(__name__)
CORS(app, origins=ALLOWED_ORIGINS)
payments = {}  # CheckoutRequestID -> status; swap for a database in production
_token = {"value": None, "exp": 0}


def access_token():
    if _token["value"] and time.time() < _token["exp"]:
        return _token["value"]
    r = requests.get(f"{BASE}/oauth/v1/generate?grant_type=client_credentials", auth=(CONSUMER_KEY, CONSUMER_SECRET), timeout=15)
    r.raise_for_status()
    data = r.json()
    _token.update(value=data["access_token"], exp=time.time() + int(data.get("expires_in", 3599)) - 60)
    return _token["value"]


def normalize_phone(phone):
    p = "".join(ch for ch in str(phone) if ch.isdigit())
    if p.startswith("0"):
        p = "254" + p[1:]
    elif len(p) == 9:
        p = "254" + p
    return p if len(p) == 12 and p.startswith("254") else None


@app.get("/")
def health():
    return jsonify(ok=True, env=ENV, configured=bool(CONSUMER_KEY and CONSUMER_SECRET and CALLBACK_URL))


@app.post("/mpesa/stkpush")
def stk_push():
    body = request.get_json(force=True, silent=True) or {}
    phone = normalize_phone(body.get("phone", ""))
    try:
        amount = int(body.get("amount", 0))
    except (TypeError, ValueError):
        amount = 0
    if not phone:
        return jsonify(error="Invalid Safaricom number"), 400
    if amount < 1:
        return jsonify(error="Invalid amount"), 400
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    payload = {
        "BusinessShortCode": SHORTCODE,
        "Password": base64.b64encode(f"{SHORTCODE}{PASSKEY}{ts}".encode()).decode(),
        "Timestamp": ts,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": str(body.get("reference", "Jukwaa"))[:12],
        "TransactionDesc": str(body.get("description", "Jukwaa payment"))[:13],
    }
    try:
        r = requests.post(f"{BASE}/mpesa/stkpush/v1/processrequest", json=payload,
                          headers={"Authorization": f"Bearer {access_token()}"}, timeout=20)
        data = r.json()
    except Exception as e:  # network / auth failure
        return jsonify(error=f"M-Pesa request failed: {e}"), 502
    if data.get("ResponseCode") != "0":
        return jsonify(error=data.get("errorMessage") or data.get("ResponseDescription") or "STK push rejected"), 400
    cid = data["CheckoutRequestID"]
    payments[cid] = {"status": "pending", "amount": amount, "phone": phone}
    return jsonify(checkoutRequestId=cid, message=data.get("CustomerMessage"))


@app.post("/mpesa/callback")
def callback():
    cb = (request.get_json(force=True, silent=True) or {}).get("Body", {}).get("stkCallback", {})
    cid = cb.get("CheckoutRequestID")
    if cid:
        rec = payments.setdefault(cid, {})
        if cb.get("ResultCode") == 0:
            items = {i["Name"]: i.get("Value") for i in cb.get("CallbackMetadata", {}).get("Item", [])}
            rec.update(status="paid", receipt=items.get("MpesaReceiptNumber"), amount=items.get("Amount"))
        else:
            rec.update(status="failed", reason=cb.get("ResultDesc"))
    return jsonify(ResultCode=0, ResultDesc="Accepted")


@app.get("/mpesa/status/<cid>")
def status(cid):
    rec = payments.get(cid)
    if not rec:
        return jsonify(status="unknown"), 404
    return jsonify(rec)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
