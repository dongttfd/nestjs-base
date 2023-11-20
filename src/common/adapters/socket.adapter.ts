import { WsAdapter } from '@nestjs/platform-ws';
import { IncomingMessage } from 'http';
import { faker } from '@faker-js/faker';
import * as WebSocket from 'ws';
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
