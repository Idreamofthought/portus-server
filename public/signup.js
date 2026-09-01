import { apiPost } from "./app.js";
const form=document.getElementById("signup-form"),msg=document.getElementById("msg");
form?.addEventListener("submit",async e=>{e.preventDefault();if(form.password.value.length<8){msg.textContent="Password must be at least 8 characters.";return}msg.textContent="Creating account…";const r=await apiPost("/api/signup",{email:form.email.value.trim(),password:form.password.value});msg.textContent=r.ok?"Account created. Check your email to verify it.":(r.error||"Signup failed.")});
