import { apiPost } from "./app.js";
const form=document.getElementById("login-form"),msg=document.getElementById("msg");
form?.addEventListener("submit",async e=>{e.preventDefault();msg.textContent="Signing in…";const r=await apiPost("/api/login",{email:form.email.value.trim(),password:form.password.value});if(!r.ok){msg.textContent=r.error||"Login failed.";return}location.href="/game"});
