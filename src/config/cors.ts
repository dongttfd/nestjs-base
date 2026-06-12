import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { isDevelopment } from '@/common/utils/helpers';

export const cors: CorsOptions = {
  origin: isDevelopment()
    ? (origin, callback) => callback(null, origin || true)
    : (process.env.FRONTEND_URL || 'http://localhost:3000'),
  credentials: true,
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
};
