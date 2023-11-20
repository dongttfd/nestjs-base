import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from '@/config/auth';

const prisma = new PrismaClient();

export const seedUser = () =>
  prisma.user.upsert({
    where: { email: 'dongtt.fd@gmail.com' },
    update: {},
    create: {
      email: 'dongtt.fd@gmail.com',
      password: bcrypt.hashSync('123456', HASH_ROUND),
      name: 'Trần Trọng Đông',
    },
  });
