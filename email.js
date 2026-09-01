import { resend } from "./resend.js";

export async function sendVerificationEmail({ email, token }) {
  const url = `${process.env.SITE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your Portus account",
    html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`
  });
}

export async function sendPasswordResetEmail({ email, token }) {
  const url = `${process.env.SITE_URL}/reset-password.html?token=${encodeURIComponent(token)}`;
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your Portus password",
    html: `<p>Click to reset your password:</p><p><a href="${url}">${url}</a></p>`
  });
}
