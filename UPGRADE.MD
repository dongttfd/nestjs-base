# Upgrade Changelog

## 2026-03-31

### Added

- `expense_overview_snapshots`
- expense overview API
- expense classifier / taxonomy

### Changed

- `npx prisma migrate deploy --schema src/database/prisma/schema.prisma`
- `npx prisma generate --schema src/database/prisma/schema.prisma`
- Migrations: `202603280001_expense_overview_snapshot`, `20260328141211_`, `202603281911_expense_overview_taxonomy_refresh`

### Notes

- `202603281911_expense_overview_taxonomy_refresh` xóa `expense_overview_snapshots`.
- `npx prisma db seed` chỉ chạy khi cần demo / fresh DB.
