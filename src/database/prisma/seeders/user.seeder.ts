import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from '@/config/auth';

export const seedUser = (prisma: PrismaClient) =>
  prisma.user.upsert({
    where: { email: 'dongtt.fd@gmail.com' },
    update: {},
    create: {
      email: 'dongtt.fd@gmail.com',
      password: bcrypt.hashSync('123456', HASH_ROUND),
      name: 'Tran Dong',
    },
  });
