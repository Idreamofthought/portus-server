import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

const unavailableResend = {
	emails: {
		async send() {
			console.warn("Email delivery is disabled: RESEND_API_KEY is not configured.");
			return {
				data: null,
				error: new Error("RESEND_API_KEY is not configured")
			};
		}
	}
};

export const resend = apiKey ? new Resend(apiKey) : unavailableResend;
