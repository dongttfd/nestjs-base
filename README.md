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

##### Prisma development:
- Change `prisma/schema.prisma` file
- Run `npx prisma migrate dev` to update migration files
- Run `npx prisma migrate deploy` to deploy migration files

### API: Swagger
- Swagger UI: `<your url>/docs`

### Cloudflare tunnel
- Install `cloudflared` on your local machine
- Run `cloudflared tunnel create api` to create a tunnel
- Run `cloudflared tunnel route dns api api.domain` to create a DNS record
- Run `cloudflared tunnel run api` to start the tunnel
- Run `cloudflared tunnel list` to list all tunnels
