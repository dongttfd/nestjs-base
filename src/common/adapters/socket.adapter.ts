import { faker } from '@faker-js/faker';
import { WebSocketAdapter, WsMessageHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import {
  SOCKET_INCOMING_MESSAGE_PROPERTY,
  SOCKET_UUID,
  WebsocketEvent,
} from '@/config';

/* eslint-disable @typescript-eslint/no-unused-vars */
export class SocketAdapter implements WebSocketAdapter {
  create(port: number, options?: any): any {
    throw new Error('Method not implemented.');
  }
  bindClientDisconnect?(client: any, callback: () => void) {
    throw new Error('Method not implemented.');
  }
  bindMessageHandlers(client: any, handlers: WsMessageHandler[], transform: (data: any) => Observable<any>) {
    throw new Error('Method not implemented.');
  }
  close(server: any) {
    throw new Error('Method not implemented.');
  }
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
