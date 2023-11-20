import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const cors: CorsOptions = {
  origin: '*',
  methods: ['GET, POST, PUT, DELETE, OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Request-With',
  ],
  exposedHeaders: [],
  maxAge: 0,
  credentials: false,
};
