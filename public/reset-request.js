import { apiPost } from "./app.js";
const form=document.getElementById("reset-request-form"),msg=document.getElementById("msg");
form?.addEventListener("submit",async e=>{e.preventDefault();msg.textContent="Sending…";const r=await apiPost("/api/request-password-reset",{email:form.email.value.trim()});msg.textContent=r.ok?"If that address exists, a reset link has been sent.":(r.error||"Something went wrong.")});
