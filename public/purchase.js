import { apiGet, apiPost } from "./app.js";
const select=document.getElementById("product"),msg=document.getElementById("msg");
async function init(){const r=await apiGet("/api/products");if(!r.ok){msg.textContent=r.error||"Could not load products.";return}for(const p of r.products){const o=document.createElement("option");o.value=p.id;o.textContent=`${p.label} — ${p.amount} ${p.currency}`;select.appendChild(o)}}
async function checkout(path){msg.textContent="Opening secure payment…";const r=await apiPost(path,{productId:select.value});if(!r.ok){msg.textContent=r.error||"Payment could not be started.";return}if(r.url)location.href=r.url;else if(r.id){msg.textContent="Payment created. Redirecting…";location.href=r.url||`/purchase.html?provider=paypal&orderId=${encodeURIComponent(r.id)}`}}
document.getElementById("card").onclick=()=>checkout("/api/checkout/stripe");
document.getElementById("paypal").onclick=()=>checkout("/api/checkout/paypal");
const q=new URLSearchParams(location.search);if(q.get("provider")==="paypal"&&q.get("status")==="return"&&q.get("token")){apiPost("/api/checkout/paypal/capture",{orderId:q.get("token")}).then(r=>{msg.textContent=r.ok?"Payment confirmed. Your time has been added.":(r.error||"Payment could not be confirmed.")})}else if(q.get("status")==="success"){msg.textContent="Payment received. Your time will appear as soon as the payment webhook is confirmed."}else if(q.get("status")==="cancelled"){msg.textContent="Payment cancelled."}
init();
