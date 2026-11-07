# One-time setup: test and production

This connects the GitHub repo to free hosting. Do it once, in this order. It takes about an hour.

| Piece | Service | Test | Production |
| --- | --- | --- | --- |
| API (Spring Boot) | Render, free web service (Docker image) | `atithi-api-test` | `atithi-api-prod` |
| Database (PostgreSQL 16) | Neon, free plan | project `atithi-test` | project `atithi-prod` |
| Web app (React) | Cloudflare Workers static assets, free | Worker `atithi-web-test` | Worker `atithi-web` |
| Photos (from step 6) | Cloudflare R2, free up to 10 GB | bucket `atithi-media-test` | bucket `atithi-media` |
| API image | GitHub Container Registry | one image per commit | same image as test |

Pick regions close to India on every service: Neon **AWS Asia Pacific (Singapore)**, Render **Singapore**.

Secrets are pasted only into Render, Neon, Cloudflare or GitHub, never into a chat or the repo. If one ever is, rotate it the same day.

## 1. GitHub repo

1. The public repo `atithi` exists. Claude pushes the first code after your approval.
2. Turn on free security features: repo → **Settings → Code security** → enable **Secret scanning**, **Push protection**, **Dependabot alerts** and **Dependabot security updates**. (CodeQL runs from `.github/workflows/codeql.yml`.)
3. The first push to `main` runs the **Deploy** workflow. CI and **Build API image** pass; **Test** fails with "environment is not set up yet". That's expected: the image now exists for Render to use.
4. Make the image public so Render can pull it: GitHub → your profile → **Packages** → `atithi-api` → **Package settings** → **Change visibility** → Public.

## 2. Neon (database), once per environment

1. At neon.com (free, no card), create project `atithi-test`, Postgres 16, region Singapore.
2. Open **Connect**, turn **Connection pooling off** (Flyway needs a direct connection), and copy the parameters.
3. Build the JDBC values for Render:
   - `SPRING_DATASOURCE_URL` = `jdbc:postgresql://<host>/<database>?sslmode=require` (no `-pooler` in the host, and drop `channel_binding`)
   - `SPRING_DATASOURCE_USERNAME` = the role name
   - `SPRING_DATASOURCE_PASSWORD` = the password
4. Repeat for `atithi-prod`.

## 3. Render (API), once per environment

Use a **new Render workspace** for Atithi (top-left workspace menu → **New workspace**). Free instance hours are shared within a workspace, so sharing one with Udaan would make the two projects compete for them.

1. **New → Web Service → Existing image**.
2. Image URL: `ghcr.io/<your-github-username>/atithi-api:<commit-sha>` (copy the full tag from the **Build API image** job log). Name `atithi-api-test`, region Singapore, instance type **Free**.
3. Environment variables:

   | Key | Test value | Production value |
   | --- | --- | --- |
   | `SPRING_DATASOURCE_URL` | from Neon `atithi-test` | from Neon `atithi-prod` |
   | `SPRING_DATASOURCE_USERNAME` | from Neon | from Neon |
   | `SPRING_DATASOURCE_PASSWORD` | from Neon | from Neon |
   | `ATITHI_ENVIRONMENT` | `test` | `production` |
   | `ATITHI_CORS_ORIGINS` | the `atithi-web-test` workers.dev address | the `atithi-web` workers.dev address |
   | `ATITHI_JWT_SECRET` | recommended: 48 random characters | **required**: a different 48 random characters |
   | `ATITHI_ADMIN_EMAILS` | your email (comma-separate several) | your email |

   `ATITHI_ADMIN_EMAILS`: an account registered with one of these addresses becomes an admin (verifies agencies, matches requests). Admin tools also require that account's email to be verified. Set it **before** you register your own account.

   Make each secret with `openssl rand -base64 36` (or a password manager's generator). Production refuses to start without `ATITHI_JWT_SECRET`.

4. Health check path: `/actuator/health`.
5. **Settings → Deploy Hook**: copy the URL. It is a secret.
6. Repeat for `atithi-api-prod`.

## 4. Cloudflare (web app and photo storage)

1. At cloudflare.com (free): **Compute → Workers & Pages → Create application → Upload your static files**.
2. Name it `atithi-web-test`, upload any placeholder `index.html`, and deploy. The pipeline replaces it.
3. Note its address, e.g. `https://atithi-web-test.<your-subdomain>.workers.dev`.
4. Repeat with the name `atithi-web`.
5. **My Profile → API Tokens → Create Token → Custom token**: permission *Account → Workers Scripts → Edit*, your account as the resource. Copy the token.
6. Your **Account ID** is the long code after `dash.cloudflare.com/` in the address bar.
7. Photo storage (can wait until step 6): **R2 → Create bucket** `atithi-media-test` and `atithi-media`. Cloudflare asks for a payment method to enable R2; usage stays free up to 10 GB.

## 5. GitHub environments and secrets

Repo → **Settings → Secrets and variables → Actions**:

- Repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Repo → **Settings → Environments**, create `test` and `production`:

| Name | Kind | `test` | `production` |
| --- | --- | --- | --- |
| `RENDER_DEPLOY_HOOK` | secret | test deploy hook URL | prod deploy hook URL |
| `API_URL` | variable | `https://atithi-api-test.onrender.com` | `https://atithi-api-prod.onrender.com` |
| `WEB_URL` | variable | `https://atithi-web-test.<subdomain>.workers.dev` | `https://atithi-web.<subdomain>.workers.dev` |
| `CF_WORKER_NAME` | variable | `atithi-web-test` | `atithi-web` |

On `production` only: tick **Required reviewers**, add yourself, and under **Deployment branches** allow only `main`. This is the gate: production never deploys until you click **Approve**.

Use the exact URLs Render and Cloudflare show you if they differ from the defaults above.

## 6. First real deploy

Actions → **Deploy** → open the failed run → **Re-run all jobs**. Test deploys and passes its smoke test (API health, `/api/v1/meta`, the web page and its security headers); Production then shows **Waiting for review**.

## Day-to-day flow

1. Claude builds a change on a `feature/*` branch and shows you a summary. Nothing is pushed until you reply "approve".
2. Claude pushes and opens a pull request. CI and CodeQL run; you reply "merge" once they are green.
3. The merge deploys to **test** automatically and checks it.
4. You check the test site. If it's good, open the run in GitHub Actions → **Review deployments → Approve**.
5. Production gets the identical image and web build.

## Limits to know

- Render free services sleep after 15 minutes idle; the first request then takes about a minute (the web app shows "Waking up the server…"). Don't add keep-alive pings: they burn the workspace's free hours. Before real travellers arrive, move `atithi-api-prod` to the paid Starter instance.
- Neon free projects suspend if they exceed the monthly compute or 0.5 GB storage allowance, until the next month. Watch usage in the Neon dashboard.
- Free-tier terms change. Re-check each provider's current limits before relying on them.
