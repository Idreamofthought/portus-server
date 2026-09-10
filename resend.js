import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
const sender = process.env.EMAIL_FROM?.trim();

export function normalizeSenderAddress(value) {
  if (!value) return null;

  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>$/);
  const candidate = match ? match[1] : trimmed;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
    return null;
  }

  return candidate;
}

export const configuredSender = normalizeSenderAddress(sender);

export const emailConfigError = !apiKey || !configuredSender
  ? "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM to a verified sender address before enabling signup or password resets. Example: Portus <no-reply@idreamofthought.org>"
  : null;

const unavailableResend = {
  emails: {
    async send() {
      console.warn(emailConfigError);
      return {
        data: null,
        error: new Error(emailConfigError)
      };
    }
  }
};

export const resend = apiKey && configuredSender ? new Resend(apiKey) : unavailableResend;
export function assertEmailConfig() {
  if (emailConfigError) {
    throw new Error(emailConfigError);
  }
}
