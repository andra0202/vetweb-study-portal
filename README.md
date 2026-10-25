# VetWeb Study Portal MVP foundation

This is an Azure-ready Next.js/TypeScript starting point for the approved specification. The browser flow is a **clearly labelled prototype**: it does not persist consent, answers, or GCash numbers, and its verification callback is simulated. Never use it to collect real participant data until the API, RBAC, security review, ethics approval, and VetWeb integration are complete.

## Local run

1. Copy `.env.example` to `.env` and set only local/development values.
2. Run `npm install` and then `npm run dev`.
3. Visit `http://localhost:3000`.

## Included foundation

- Mobile consent → task → server-verification-gated-survey → payment-reference UX.
- PostgreSQL/Prisma model with separate payment claim and survey response records.
- Azure Bicep starter for PostgreSQL Flexible Server and Key Vault.
- A fail-closed, HMAC-authenticated VetWeb webhook boundary; it returns `503`
  until database-backed idempotency and the formal VetWeb callback contract exist.

## Required before any real deployment

- Final research protocol, ethics/DPO approval, real institutional contact details, and final incentive wording.
- VetWeb signed launch-token validation, event API, signed callback, rate limiting, replay/idempotency protection, and audit service.
- API persistence, encryption of GCash data, Entra-based staff RBAC, restricted payment queue, exports, monitoring, private networking, and a reviewed backup/retention plan.
- Azure subscription, domain, resource names, and least-privilege managed identity assignments.
