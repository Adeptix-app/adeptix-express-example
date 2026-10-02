// Stand-in for your own database. A real integration looks up/updates a real orders table by
// order_ref (or transaction_id / payment_request_id) instead of this in-memory Map, but the shape
// of the lookups is exactly what you'd do against a real one.
export const orders = new Map();

export function createOrder(orderRef, description) {
  orders.set(orderRef, { orderRef, description, status: "pending", paidVia: null, updatedAt: new Date().toISOString() });
}

export function markOrderPaid(orderRef, paidVia) {
  const order = orders.get(orderRef);
  if (!order) return null;
  order.status = "paid";
  order.paidVia = paidVia;
  order.updatedAt = new Date().toISOString();
  return order;
}
