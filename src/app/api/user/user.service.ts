import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  findById(id: string) {
    return this.findFirst({ id });
  }

  findFirst(where: Prisma.UserWhereInput) {
    return this.prismaService.user.findFirst({
      where,
    });
  }
}
