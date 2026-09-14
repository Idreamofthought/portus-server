import { apiPost } from "/app.js";

const params = new URLSearchParams(location.search);
const verify = params.get("verify");
const paid = params.get("paid");

function showBanner(html, tone = "warn") {
  const banner = document.createElement("div");
  banner.className = "status-banner";
  const bg = tone === "ok" ? "#d1e7dd" : "#fff3cd";
  const fg = tone === "ok" ? "#0f5132" : "#664d03";
  banner.style.cssText = `background:${bg};color:${fg};padding:0.9rem 1.2rem;text-align:center;font-size:0.95rem;`;
  banner.innerHTML = html;
  const nav = document.querySelector(".idot-topnav");
  if (nav) nav.insertAdjacentElement("afterend", banner);
  return banner;
}

function wireResendButton(banner) {
  const btn = document.createElement("button");
  btn.textContent = "Resend verification email";
  btn.style.marginLeft = "0.75rem";
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      const r = await apiPost("/api/resend-verification", {});
      btn.textContent = r.ok ? (r.alreadyVerified ? "Already verified — try logging in again" : "Sent — check your inbox") : (r.error || "Could not send, try again");
    } catch {
      btn.textContent = "Could not send — try again";
      btn.disabled = false;
    }
  };
  banner.appendChild(btn);
}

if (verify === "success") {
  showBanner("Your email is verified. <a href=\"/login.html\">Log in</a> to continue.", "ok");
} else if (verify === "invalid") {
  const banner = showBanner("That verification link has expired or was already used.");
  wireResendButton(banner);
} else if (verify === "missing" || verify === "required") {
  const banner = showBanner("Please verify your email before playing — check your inbox for the verification link.");
  wireResendButton(banner);
} else if (paid === "required") {
  showBanner('You need active time on your account to play. <a href="/purchase.html">Buy a pass</a> to continue.');
}
