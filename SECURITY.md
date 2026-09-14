# Security Policy

## Supported versions

Only the latest deployment on the `main` branch is actively supported.

## Reporting a vulnerability

Please do not open a public GitHub issue for a suspected security problem.
Report it privately through the repository owner's GitHub security contact or
the contact address published at:

https://www.idreamofthought.org/contact

Include:

- A short description of the issue and its impact
- The affected route, file, or deployed surface
- Reproduction steps or a minimal proof of concept
- Any suggested mitigation, if known

Do not include passwords, API keys, payment credentials, or other secrets in a
report. We will acknowledge valid reports when possible, investigate the issue,
and coordinate disclosure and remediation with the reporter.

## Deployment secrets

Secrets belong in the deployment environment, never in source control. This
includes JWT, Resend, Stripe, PayPal, database, and webhook credentials.