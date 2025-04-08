import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { HASH_ROUND } from '@/config/auth';

export const seedUser = (prisma: PrismaClient) =>
  prisma.user.upsert({
    where: { email: 'dongtt.fd@gmail.com' },
    update: {},
    create: {
      email: 'dongtt.fd@gmail.com',
      phone: '0368368368',
      password: bcrypt.hashSync('12345678', HASH_ROUND),
      name: 'Tran Dong',
    },
  });
