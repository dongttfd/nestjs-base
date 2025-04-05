# Base NestJS

### Environment
```
node: >= 16+
```

### Setup
- Copy `env.example` to `.env` and change config
- Run `npm install` to install packages
- Run `npm run start:dev` when developing
- Build: `npm run build`

**For developer, setup** `husky`: `npm run prepare`

### DB
- use [Prisma](https://www.prisma.io/)
```
// mysql config at .env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_PASSWORD=nestjs
MYSQL_USERNAME=nestjs
MYSQL_DB=prisma
```

#### Migration and seed
- Migrate: `npx prisma migrate`;
- Update migration file `npx prisma migrate dev`
- Reset: `npx prisma migrate reset`
- Seed: `npx prisma db seed`
- Sync schema to Prisma models: `npx prisma generate`

### API: Swagger
- Swagger UI: `<your url>/docs`