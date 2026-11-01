"use client";
/* Orders placed through published pages: "Who ordered what, and who do I reply to first?" */
import { useEffect, useState } from "react";
import { store, type Order } from "@/lib/store";
import { money, relDate, waNumber } from "@/lib/format";
import { TopBar } from "./ui";

export default function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    store
      .orders()
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, []);
  const today = (orders || []).filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString(),
  );
  const todayTotal = today.reduce((s, o) => s + o.total, 0);

  return (
    <div className="v-home">
      <TopBar active="orders" />
      <main className="sheet">
        <div className="col">
          <div className="title-row">
            <div>
              <h1>Orders</h1>
              <p className="subline">
                {orders === null ? (
                  "Loading orders…"
                ) : (
                  <>
                    <b>{today.length} today</b> · {money(todayTotal)}. Checkout
                    enquiries are recorded here. Delivery of the WhatsApp
                    message and payment are confirmed separately.
                  </>
                )}
              </p>
            </div>
          </div>
          {error && (
            <div className="notice" role="alert">
              <p>Couldn’t load orders. {error}</p>
            </div>
          )}
          {orders && !orders.length && (
            <div className="empty-slot">
              No orders yet. When a buyer taps the WhatsApp order button on your
              live page, the order is listed here too.
            </div>
          )}
          {orders && orders.length > 0 && (
            <table className="ptable otable">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Items</th>
                  <th className="c-page">Page</th>
                  <th className="num">Total</th>
                  <th className="num c-date">Placed</th>
                  <th>
                    <span className="sr">Reply</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.customer.name}</b>
                      <span className="sub num">{o.customer.phone}</span>
                      {o.customer.address && (
                        <span className="sub">{o.customer.address}</span>
                      )}
                      {o.customer.variant && (
                        <span className="sub">{o.customer.variant}</span>
                      )}
                      {o.customer.date && (
                        <span className="sub">
                          Preferred: {o.customer.date} {o.customer.time}
                        </span>
                      )}
                    </td>
                    <td>
                      {o.items.map((it, i) => (
                        <span key={i} className="oitem">
                          {it.qty} × {it.name}
                        </span>
                      ))}
                      {o.shipping && (
                        <span className="sub">{o.shipping.label}</span>
                      )}
                    </td>
                    <td className="c-page">
                      <a
                        className="livelink"
                        href={"/" + o.slug}
                        target="_blank"
                        rel="noopener"
                      >
                        /{o.slug}
                      </a>
                    </td>
                    <td className="num">
                      <b>{money(o.total)}</b>
                    </td>
                    <td className="num c-date">{relDate(o.createdAt)}</td>
                    <td className="acts">
                      <a
                        className="btn sm"
                        href={`https://wa.me/${waNumber(o.customer.phone)}`}
                        target="_blank"
                        rel="noopener"
                      >
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
