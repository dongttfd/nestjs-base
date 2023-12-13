import { INestApplication } from '@nestjs/common';
import { SocketAdapter } from '@/common';

export const useWebSocket = (socketApp: INestApplication) => {
  socketApp.useWebSocketAdapter(new SocketAdapter(socketApp));
};
