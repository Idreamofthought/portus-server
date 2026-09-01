import { getCurrentUser, apiGet, apiPost } from "./app.js";
const userEl=document.getElementById("user"),timeEl=document.getElementById("time"),msg=document.getElementById("msg");
const fmt=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}h ${m}m`:`${m}m`};
async function load(){const u=await getCurrentUser();if(!u.ok){location.href="/login.html";return}userEl.textContent=u.email;const a=await apiGet("/api/access");timeEl.textContent=fmt(a.remainingSeconds||0)}
document.getElementById("logout")?.addEventListener("click",async()=>{const r=await apiPost("/api/logout");if(r.ok)location.href="/portus"});
document.getElementById("delete")?.addEventListener("click",async()=>{if(!confirm("Delete your Portus account and saved city? This cannot be undone."))return;const r=await apiPost("/api/delete-account");msg.textContent=r.ok?"Account deleted.":(r.error||"Deletion failed.");if(r.ok)setTimeout(()=>location.href="/signup.html",800)});load();
