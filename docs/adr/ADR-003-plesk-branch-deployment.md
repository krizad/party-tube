# ADR-003: Plesk Backend Deployment via dist-plesk Branch

## Status
Accepted (Pattern from `kz-game-hub`)

## Context
- The production deployment environment uses:
  - **Frontend**: Vercel (connected to GitHub `main` branch).
  - **Backend**: Self-hosted Plesk (Shared Hosting, Node.js Extension).
  - **Database**: Plesk MySQL/MariaDB (`127.0.0.1:3306`).
- **Constraint**: Plesk Shared Hosting cannot run root Nginx commands, does not have global `pnpm`, and cannot handle monorepo symlinks in `.pnpm`.

## Solution
Mirror the battle-tested deployment pipeline from `kz-game-hub`:
1. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
   - Triggers on push to `main` when backend/packages change.
   - Runs `scripts/bundle-api.mjs`.
   - Switches Prisma schema to `mysql` and builds backend.
   - Packages `@partytube/database` and `@partytube/shared-types` locally into a flat `deploy-api/` directory (zero symlinks, exact pinned deps, generated `.prisma` client copied into `node_modules/.prisma`).
   - Commits and pushes the complete ready-to-run bundle to the **`dist-plesk`** branch.
2. **Plesk Git Configuration**:
   - Plesk Git repository on the Backend subdomain is pointed to branch: **`dist-plesk`**.
   - Pulling the branch delivers `dist/main.js` and complete `node_modules/` with zero build steps on Plesk.
   - Startup file in Plesk Node.js: `dist/main.js`.
