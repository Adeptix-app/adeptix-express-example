# Adeptix + Express example

A minimal, complete Express server showing both API categories end to end:

- `GET /` — two buttons: pay by card (Merchant Payments API) or pay in USDC (Crypto Payments API)
- `POST /checkout/merchant` — creates a hosted checkout, redirects the customer to it
- `POST /checkout/crypto` — creates a crypto payment request, shows the address/amount to send
- `GET /orders/:orderRef/status` / `GET /crypto-orders/:id/status` — polling fallback
- `POST /webhooks/adeptix` — signature-verified webhook handler that marks an order paid

Orders are kept in an in-memory `Map` (`src/orders.js`) purely so this example has something to
mark "paid" — replace that with your real database; the lookup/update shape stays the same.

## Run it

```bash
npm install
ADEPTIX_API_KEY=ak_live_... ADEPTIX_WEBHOOK_SECRET=whsec_... npm start
```

Then open http://localhost:3000.

`npm install` pulls the [Adeptix Node SDK](https://github.com/Adeptix-app/adeptix-node) straight
from GitHub (it is installed straight from GitHub), so `git` needs to be on your `PATH`.

To receive webhooks locally, tunnel port 3000 (e.g. with `cloudflared tunnel` or `ngrok http 3000`)
and set the tunnel's URL + `/webhooks/adeptix` as your webhook URL in the Adeptix dashboard's
Settings page, alongside the same secret you pass as `ADEPTIX_WEBHOOK_SECRET` here.

Full API reference: **https://docs.adeptix.app**
