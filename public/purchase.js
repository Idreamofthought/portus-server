import { apiGet, apiPost } from "./app.js";

const select = document.getElementById("product");
const msg = document.getElementById("msg");
const cardButton = document.getElementById("card");
const paypalButton = document.getElementById("paypal");
const consentCheckbox = document.getElementById("withdrawal-consent");
const retryButton = document.getElementById("retry-confirm");

const MAX_CONFIRM_RETRIES = 2;
let confirmationInFlight = false;

function setCheckoutEnabled(enabled) {
  cardButton.disabled = !enabled;
  paypalButton.disabled = !enabled;
}

function hideRetryButton() {
  retryButton.hidden = true;
  retryButton.disabled = true;
  retryButton.setAttribute("aria-hidden", "true");
}

function showRetryButton() {
  retryButton.hidden = false;
  retryButton.disabled = false;
  retryButton.setAttribute("aria-hidden", "false");
  retryButton.focus();
}

function hasTransientError(error) {
  const text = String(error?.message || error || "").toLowerCase();
  return text.includes("failed to fetch")
    || text.includes("network")
    || text.includes("timed out")
    || text.includes("timeout")
    || text.includes("temporar");
}

async function retryConfirmation(path, payload, retries = MAX_CONFIRM_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await apiPost(path, payload);
      if (!result.ok) {
        throw new Error(result.error || "Payment could not be confirmed.");
      }
      return result;
    } catch (error) {
      if (attempt < retries && hasTransientError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Payment could not be confirmed.");
}

async function init() {
  const r = await apiGet("/api/products");
  if (!r.ok) {
    msg.textContent = r.error || "Could not load products.";
    return;
  }
  for (const p of r.products) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = `${p.label} — ${p.amount} ${p.currency}`;
    select.appendChild(o);
  }
}

async function checkout(path) {
  if (!consentCheckbox.checked) {
    msg.textContent = "Please confirm withdrawal-rights consent before checkout.";
    return;
  }

  msg.textContent = "Opening secure payment…";

  try {
    const r = await apiPost(path, { productId: select.value, withdrawalConsent: true });
    if (!r.ok) {
      msg.textContent = r.error || "Payment could not be started.";
      return;
    }
    if (r.url) {
      location.href = r.url;
      return;
    }
    if (r.id) {
      msg.textContent = "Payment created. Redirecting…";
      location.href = r.url || `/purchase.html?provider=paypal&status=return&token=${encodeURIComponent(r.id)}`;
      return;
    }
    msg.textContent = "Payment could not be started.";
  } catch (error) {
    msg.textContent = error?.message || "Network error while starting payment.";
  }
}

cardButton.onclick = () => checkout("/api/checkout/stripe");
paypalButton.onclick = () => checkout("/api/checkout/paypal");
consentCheckbox.addEventListener("change", () => setCheckoutEnabled(consentCheckbox.checked));
setCheckoutEnabled(consentCheckbox.checked);

const q = new URLSearchParams(location.search);
hideRetryButton();

async function confirmAndReport(path, payload) {
  if (confirmationInFlight) return;
  confirmationInFlight = true;
  hideRetryButton();
  msg.textContent = "Confirming payment…";
  try {
    await retryConfirmation(path, payload);
    msg.textContent = "Payment confirmed. Your time has been added.";
    hideRetryButton();
  } catch (error) {
    msg.textContent = `${error?.message || "Payment could not be confirmed."} You can retry manually.`;
    showRetryButton();
  } finally {
    confirmationInFlight = false;
  }
}

if (q.get("provider") === "paypal" && q.get("status") === "return" && q.get("token")) {
  const payload = { orderId: q.get("token") };
  retryButton.onclick = () => confirmAndReport("/api/checkout/paypal/capture", payload);
  confirmAndReport("/api/checkout/paypal/capture", payload);
} else if (q.get("provider") === "stripe" && q.get("status") === "success" && q.get("session_id")) {
  const payload = { sessionId: q.get("session_id") };
  retryButton.onclick = () => confirmAndReport("/api/checkout/stripe/confirm", payload);
  confirmAndReport("/api/checkout/stripe/confirm", payload);
} else if (q.get("status") === "cancelled") {
  msg.textContent = "Payment cancelled.";
}

init();
