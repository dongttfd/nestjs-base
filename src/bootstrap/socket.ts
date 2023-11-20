import { SocketAdapter } from '@/common';
import { INestApplication } from '@nestjs/common';

export const useWebSocket = (socketApp: INestApplication) => {
  socketApp.useWebSocketAdapter(new SocketAdapter(socketApp));
};
