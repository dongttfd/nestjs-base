import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common';

@Injectable()
export class UserDeviceService {
  constructor(private prismaService: PrismaService) {}

  createOrUpdate(userId: string, deviceId: string, accessToken: string, sessionId: string) {
    return this.prismaService.userDevice.upsert({
      where: {
        // eslint-disable-next-line camelcase
        deviceId_userId: { userId, deviceId },
      },
      update: { accessToken, sessionId },
      create: {
        userId,
        deviceId,
        accessToken,
        sessionId,
      },
    });
  }

  findBySessionId(sessionId: string) {
    return this.prismaService.userDevice.findFirst({
      where: { sessionId },
    });
  }

  find(where: Prisma.UserDeviceWhereInput) {
    return this.prismaService.userDevice.findFirst({ where });
  }

  delete(userId: string, deviceId: string) {
    return this.prismaService.userDevice
      .deleteMany({
        where: {
          userId,
          deviceId,
        },
      })
      .then(({ count }) => count > 0);
  }
}
