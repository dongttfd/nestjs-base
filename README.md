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
- Seed: `npm prisma db seed`