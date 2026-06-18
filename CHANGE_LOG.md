# CHANGELOG

## [2026-06-20]
- Replaced rule-based expense classifier with AI-based classifier (Python microservice).
- Updated Prisma schema to support `classifierVersion` `expense-classifier-ai-v1`.
- Added migration script to re-classify existing transactions.

### Update Instructions
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run migrate:categories # Run this once to re-classify old data
```

## [2026-06-12]
- Migrated to Session-based Auth (`HttpOnly` cookie).
- Added `sessionId` to `user_devices` table.
- Fixed circular dependencies.
- Updated environment variables configuration (added `FRONTEND_URL`).

### Update Instructions
```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

- Ensure you sync your `.env` file with any new variables added to `.env.example` (e.g., `FRONTEND_URL`).
