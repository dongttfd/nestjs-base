import { Response } from 'express';
import ms, { StringValue } from 'ms';
import { SESSION_COOKIE_NAME, configApp } from '@/config';
import { isDevelopment } from './helpers';

export const setAuthCookie = (res: Response, sessionId: string) => {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: !isDevelopment(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ms(configApp().jwt.refreshExpiration as StringValue),
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
};
