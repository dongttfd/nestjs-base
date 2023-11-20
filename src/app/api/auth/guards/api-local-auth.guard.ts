import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { API_LOCAL_GUARD_NAME } from '@/config';

@Injectable()
export class ApiLocalAuthGuard extends AuthGuard(API_LOCAL_GUARD_NAME) {}
