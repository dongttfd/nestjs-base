import { faker } from '@faker-js/faker';
import { WsAdapter } from '@nestjs/platform-ws';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import {
  SOCKET_INCOMING_MESSAGE_PROPERTY,
  SOCKET_UUID,
  WebsocketEvent,
} from '@/config';

export class SocketAdapter extends WsAdapter {
  bindClientConnect(
    server: WebSocket.Server,
    callback: (socket, request: IncomingMessage) => void,
  ) {
    server.on(WebsocketEvent.CONNECTION, (socket, request: IncomingMessage) => {
      socket[SOCKET_INCOMING_MESSAGE_PROPERTY] = request;
      socket[SOCKET_UUID] = faker.string.uuid();
      callback(socket, request);
    });
  }
}
