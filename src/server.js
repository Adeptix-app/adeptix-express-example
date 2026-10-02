import express from "express";
import crypto from "node:crypto";
import { AdeptixClient, AdeptixApiError, parseWebhookEvent } from "adeptix";
import { orders, createOrder, markOrderPaid } from "./orders.js";

const PORT = process.env.PORT ?? 3000;
const ADEPTIX_API_KEY = process.env.ADEPTIX_API_KEY ?? "ak_live_replace_me";
const ADEPTIX_WEBHOOK_SECRET = process.env.ADEPTIX_WEBHOOK_SECRET ?? "whsec_replace_me";

const client = new AdeptixClient({ apiKey: ADEPTIX_API_KEY });
const app = express();

app.get("/", (_req, res) => {
  res.type("html").send(`
    <h1>Adeptix + Express example</h1>
    <form method="post" action="/checkout/merchant">
      <input type="hidden" name="amount" value="49.00" />
      <input type="hidden" name="currency" value="USD" />
      <input type="hidden" name="provider" value="stripe" />
      <button type="submit">Pay $49.00 with card (Stripe)</button>
    </form>
    <form method="post" action="/checkout/crypto">
      <input type="hidden" name="amount" value="49.00" />
      <input type="hidden" name="chain" value="polygon" />
      <input type="hidden" name="token" value="USDC" />
      <button type="submit">Pay 49.00 USDC on Polygon</button>
    </form>
  `);
});

// --- Merchant Payments API: create a hosted checkout, redirect the customer to it ---
app.post("/checkout/merchant", express.urlencoded({ extended: false }), async (req, res) => {
  const orderRef = `order_${crypto.randomUUID()}`;
  createOrder(orderRef, "Express example order");

  try {
    const payment = await client.payments.create({
      amount: req.body.amount,
      currency: req.body.currency,
      email: "customer@example.com",
      provider: req.body.provider,
      orderRef,
    });
    res.redirect(303, payment.payment_url);
  } catch (err) {
    if (err instanceof AdeptixApiError) {
      res.status(err.status).send(`Checkout failed: ${err.code}`);
      return;
    }
    throw err;
  }
});

// --- Crypto Payments API: show the customer an address + exact amount to send ---
app.post("/checkout/crypto", express.urlencoded({ extended: false }), async (req, res) => {
  const orderRef = `order_${crypto.randomUUID()}`;
  createOrder(orderRef, "Express example order");

  try {
    const request = await client.crypto.createPaymentRequest({
      chain: req.body.chain,
      token: req.body.token,
      amount: req.body.amount,
      orderRef,
    });
    res.type("html").send(`
      <h1>Send exactly ${request.amount} ${request.token}</h1>
      <p>To: <code>${request.pay_to_address}</code> on ${request.chain}</p>
      <p>This request expires at ${request.expires_at}.</p>
      <p><a href="/crypto-orders/${request.payment_request_id}/status">Check status</a></p>
    `);
  } catch (err) {
    if (err instanceof AdeptixApiError) {
      res.status(err.status).send(`Could not create a crypto payment request: ${err.code}`);
      return;
    }
    throw err;
  }
});

// --- Polling fallback for both rails (prefer the webhook below in production) ---
app.get("/orders/:orderRef/status", (req, res) => {
  const order = orders.get(req.params.orderRef);
  if (!order) return res.status(404).json({ error: "not_found" });
  res.json(order);
});

app.get("/crypto-orders/:paymentRequestId/status", async (req, res) => {
  const status = await client.crypto.getPaymentRequest(req.params.paymentRequestId);
  res.json(status);
});

// --- Webhook: verify signature against the RAW body before trusting anything ---
app.post("/webhooks/adeptix", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  try {
    event = parseWebhookEvent(req.body, req.header("x-adeptix-signature"), ADEPTIX_WEBHOOK_SECRET);
  } catch {
    return res.status(401).end();
  }

  if (event.event === "payment.paid" && event.order_ref) {
    markOrderPaid(event.order_ref, "merchant");
  } else if (event.event === "crypto_payment.matched" && event.order_ref) {
    markOrderPaid(event.order_ref, "crypto");
  }

  res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`Adeptix Express example listening on http://localhost:${PORT}`);
});
