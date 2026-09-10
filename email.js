import { assertEmailConfig, configuredSender, resend } from "./resend.js";

async function sendEmail(options) {
  assertEmailConfig();

  const result = await resend.emails.send(options);
  if (result?.error) {
    const message = result.error.message || JSON.stringify(result.error);
    throw new Error(message);
  }
  return result;
}

export async function sendVerificationEmail({ email, token }) {
  const url = `${process.env.SITE_URL || "https://www.idreamofthought.org"}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    from: `Portus <${configuredSender}>`,
    to: email,
    subject: "Verify your Portus account",
    html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`
  });
}

export async function sendPasswordResetEmail({ email, token }) {
  const url = `${process.env.SITE_URL || "https://www.idreamofthought.org"}/reset-password.html?token=${encodeURIComponent(token)}`;
  return sendEmail({
    from: `Portus <${configuredSender}>`,
    to: email,
    subject: "Reset your Portus password",
    html: `<p>Click to reset your password:</p><p><a href="${url}">${url}</a></p>`
  });
}
