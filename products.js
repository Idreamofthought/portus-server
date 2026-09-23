// Canonical commercial catalogue. The browser never decides the price or duration.
export const PRODUCTS = Object.freeze({
  hour: { id: "hour", label: "1 hour", minutes: 60, amount: "2.00", currency: "EUR" },
  three_hours: { id: "three_hours", label: "3 hours", minutes: 180, amount: "5.00", currency: "EUR" },
  day: { id: "day", label: "24 hours", minutes: 1440, amount: "20.00", currency: "EUR" }
});

export function getProduct(id) {
  return PRODUCTS[id] || null;
}
