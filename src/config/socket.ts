export const SOCKET_INCOMING_MESSAGE_PROPERTY = 'incomingMessage';
export const SOCKET_UUID = 'drivez_socket_uuid';
export const JWT_SOCKET_GUARD_NAME = 'socket-jwt';
export const JWT_SOCKET_PARAMETER_NAME = 'accessToken';

export enum SocketEvent {
  DEMO_PUSH = 'demoPush',
  DEMO_FETCH = 'demoFetch',
  DEMO_AUTH = 'demoAuth',
  DEMO_ERROR = 'demoError',

  // Smart contract event
  SM_OPEN_BOX = 'smOpenedBox',
  SM_STAKING_OPENED_BOX = 'smStakingOpenedBox',
}

export enum WebsocketEvent {
  CONNECTION = 'connection',
  OPEN = 'open',
  CLOSE = 'close',
  ERROR = 'error',
  MESSAGE = 'message',
  RETRY = 'retry'
}

export const SOCKET_CODES = {
  SERVER_ERROR: 4500,
  UNAUTHORIZED: 4401,
};
