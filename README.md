# Atithi

*Atithi Devo Bhava — the guest is god.*

Atithi helps foreign travellers plan a safe, well-informed trip to India, then book it with a verified Indian travel agent. Travellers read detailed itineraries, safety advice and food guides, request free proposals from up to five matched agents, and share their own trip stories.

## Status

Step 1 of the MVP: project skeleton, CI/CD and zero-cost hosting. Features arrive one pull request per step (accounts, content pages, trip requests, proposals, community, agent portal, admin).

## Run locally

```bash
docker compose up -d                      # Postgres 16 and MinIO
cd backend && ./gradlew bootRun           # API on http://localhost:8080
cd web && cp .env.example .env && npm ci && npm run dev   # web app on http://localhost:5173
```

Check it works: <http://localhost:8080/api/v1/meta> and <http://localhost:5173>.

## Deploy

Every push to `main` deploys to **test**; **production** waits for the owner's approval in GitHub and gets the same image. One-time hosting setup (Render, Neon, Cloudflare): [docs/SETUP.md](docs/SETUP.md).

## Stack

Spring Boot 4.1 (Java 21) · PostgreSQL 16 · React 19 + Vite + TypeScript + Tailwind · Render · Neon · Cloudflare Workers and R2 · GitHub Actions.

Rules for contributors (and for Claude): [CLAUDE.md](CLAUDE.md).
