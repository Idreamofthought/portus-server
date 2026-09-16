// Shows a paywall/verification banner when redirected here from /game, and
// swaps game links to the purchase page when payment is required.
// Extracted from an inline <script> so script-src can drop 'unsafe-inline'.
const accessMessage = document.getElementById("access-message");
const params = new URLSearchParams(window.location.search);
if (params.get("paid") === "required" || params.get("verify") === "required") {
  accessMessage.hidden = false;
  accessMessage.textContent = params.get("verify") === "required"
    ? "Verify your email address before entering Portus."
    : "Choose a pass to enter the playable build of Portus.";
  if (params.get("paid") === "required") {
    document.querySelectorAll('a[href="/game"]').forEach((link) => {
      link.href = "/purchase.html";
      if (link.classList.contains("primary-cta")) link.innerHTML = "Get access to Portus <span>↗</span>";
      else if (link.classList.contains("nav-play")) link.textContent = "Get access";
    });
  }
}
