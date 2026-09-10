import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
const sender = process.env.EMAIL_FROM?.trim();

export const emailConfigError = !apiKey || !sender
  ? "Email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM to your .env file before enabling signup or password resets."
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

export const resend = apiKey && sender ? new Resend(apiKey) : unavailableResend;
export function assertEmailConfig() {
  if (emailConfigError) {
    throw new Error(emailConfigError);
  }
}
