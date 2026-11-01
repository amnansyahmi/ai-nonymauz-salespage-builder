import type { Props } from "./types";
import { nonnegative } from "./format";
export function checkoutState(
  p: Props,
  quantities: unknown[],
  shippingIndex: number,
) {
  const items: Props[] = p.items || [],
    shipping: Props[] = p.shipping || [];
  const q = items.map((_, i) => Math.floor(nonnegative(quantities[i], 999)));
  const sub = items.reduce(
    (sum, it, i) => sum + q[i] * nonnegative(it.price),
    0,
  );
  const chosen = shipping[shippingIndex] || null;
  const fee =
    Number(p.freeShipMin) > 0 && sub >= Number(p.freeShipMin)
      ? 0
      : nonnegative(chosen?.fee);
  return {
    q,
    sub: Math.round(sub * 100) / 100,
    chosen,
    fee,
    total: Math.round((sub + fee) * 100) / 100,
  };
}
export function validPhone(value: string) {
  return (
    /^[+()\d\s-]{8,25}$/.test(value) &&
    /^\d{8,15}$/.test(value.replace(/\D/g, ""))
  );
}
export function validAppointment(date: string, time: string, now = Date.now()) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(time) &&
    new Date(date + "T" + time).getTime() > now
  );
}
