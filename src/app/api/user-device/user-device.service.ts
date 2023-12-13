import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common';

@Injectable()
export class UserDeviceService {
  constructor(private prismaService: PrismaService) {}

  createOrUpdate(userId: string, deviceId: string, token: AuthToken) {
    return this.prismaService.userDevice.upsert({
      where: {
        // eslint-disable-next-line camelcase
        deviceId_userId: { userId, deviceId },
      },
      update: token,
      create: {
        userId,
        deviceId,
        ...token,
      },
    });
  }

  find(where: Prisma.UserDeviceWhereInput) {
    return this.prismaService.userDevice.findFirst({ where });
  }

  delete(userId: string, deviceId: string) {
    return this.prismaService.userDevice.delete({
      where: {
        // eslint-disable-next-line camelcase
        deviceId_userId: { userId, deviceId },
      },
    });
  }
}
