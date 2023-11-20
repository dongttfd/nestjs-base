import { PrismaClient } from '@prisma/client';
import { seedUser } from './seeders/user.seeder';
const prisma = new PrismaClient();

const main = async () => seedUser();

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
