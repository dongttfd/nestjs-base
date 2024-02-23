import { PrismaClient } from '@prisma/client';
import { seedFinance, seedUser } from './seeders';

const prisma = new PrismaClient();

const main = async () => {
  await seedUser(prisma);
  await seedFinance(prisma);
};

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
