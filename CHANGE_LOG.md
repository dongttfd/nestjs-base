# CHANGELOG

## [2026-06-12]
- Migrated to Session-based Auth (`HttpOnly` cookie).
- Added `sessionId` to `user_devices` table.
- Fixed circular dependencies.
- Updated environment variables configuration (added `FRONTEND_URL`).

### Update Instructions
```bash
npm install
npx prisma generate
npx prisma db push
```

- Ensure you sync your `.env` file with any new variables added to `.env.example` (e.g., `FRONTEND_URL`).
