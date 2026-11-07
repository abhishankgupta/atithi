# Atithi — instructions for Claude

Atithi is a marketplace that helps foreign travellers plan safe trips to India and get proposals from verified Indian travel agents. Product: "Atithi — Product Requirements". Plan: "Atithi — Development Plan". Stack and guardrails follow Project Udaan (github.com/abhishankgupta/project-udaan).

## Process (never skip)

1. Work on a `feature/*` branch. Show the owner a summary. **Nothing is pushed until the owner replies "approve".**
2. After approval: push the branch and open a pull request. Nothing deploys from a pull request.
3. If checks fail, fix on the same branch, push, and explain what changed. Merge only when the owner replies "merge" and checks are green.
4. A merge to `main` deploys to test automatically. Production waits for the owner's **Approve and deploy** in GitHub, and always gets the exact image that passed on test.
5. Secrets go only into Render, Neon, Cloudflare or GitHub, never into chat, the repo or logs. If a secret is ever exposed, tell the owner to rotate it the same day.

## Layout

- `backend/` Spring Boot 4.1, Java 21, Gradle (Kotlin DSL). Package `org.atithi`.
- `web/` React 19, Vite, TypeScript, React Router, TanStack Query, Zustand, Tailwind 4, oxlint, Vitest.
- `.github/workflows/` `ci.yml` (every PR), `deploy.yml` (push to main → test → production after approval), `deploy-environment.yml`, `codeql.yml`.
- `docs/SETUP.md` one-time hosting setup (Render, Neon, Cloudflare Workers + R2, GitHub environments).

## Commands

- Web: `cd web && npm ci && npm run lint && npm run typecheck && npm test && npm run build`. Run all of these before every push.
- Backend: `cd backend && ./gradlew test` (needs Postgres: `docker compose up -d`). Claude's workspace can't download Java libraries, so backend tests run only in GitHub CI. Keep backend changes small and carefully reviewed.

## Backend rules

- Modules expose only an `api` package (facade, DTO records, events). Entities never leave their module.
- Schema changes are new Flyway migrations (`V2__...`). Never edit an applied migration; keep them backward-compatible, since old and new API versions overlap during a deploy.
- Errors are RFC 7807 bodies with a stable `code` (`ApiException`, `FieldException`, `NotFoundException`); field problems use `fieldErrors`.
- Side effects (notifications, emails) run after commit and never undo the action. Counters change only through atomic SQL. Visible actions are idempotent.
- Optional yes/no request fields use `Boolean`, not `boolean`.
- `ATITHI_JWT_SECRET` is required in production (`JwtKeys`). Don't weaken this.

## Frontend rules

- Server data goes through TanStack Query hooks. Components never call `fetch` directly.
- Shareable views keep filters in the URL. Drafts and sessions use localStorage, wrapped in try/catch.
- Client validation mirrors the API, but the API is the authority; show API field errors next to the field.
- Accessibility: every input has a label; toggles use `aria-pressed`; status messages use `role="status"` or `role="alert"`.
- The Content-Security-Policy (`web/security-headers.ts`) forbids inline scripts and limits API calls to the configured API. Don't add `unsafe-inline`, `unsafe-eval` or third-party script/font hosts; self-host instead.
- Brand: cream `#FFF8EE`, indigo `#16204A`, saffron `#E26D2C`, marigold `#F2A93B`, rani pink `#C8326B`, peacock teal `#0F6E6E`; Fraunces for display, Inter for text (self-hosted via Fontsource).

## Atithi-specific guardrails

- **Traveller contact privacy:** agents never see a traveller's email or phone until that traveller shortlists them; every reveal is audited.
- **Lead fairness:** a request goes to at most 5 agents; agents never see other agents' proposals or prices.
- **No scraping:** no exports of traveller lists; lead views and messages are rate-limited.
- **Honest content:** agent itineraries and sponsored content are always labelled; reviews only from confirmed bookings; nobody edits another person's review except through a logged moderation decision.
- **Safety content:** each safety page has an owner and a `last_reviewed` date; CI fails if it is more than 6 months old. Emergency numbers are 112 (all emergencies) and 1363 / 1800-11-1363 (tourist helpline).
- **Privacy law:** record consent before a request reaches agents; travellers can export and delete their data (GDPR, India's DPDP Act).
- The UI always shows emergency numbers in the footer and a non-production banner outside production.

## Testing

- Backend: end-to-end HTTP tests against a real Postgres in CI, each using unique data. Pure rules get unit tests.
- Frontend: Vitest + Testing Library with a fetch mock (`src/test/utils.tsx`). Every screen flow has a test; fixtures include every field the API returns.
