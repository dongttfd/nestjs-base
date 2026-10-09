import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type {
  SchoolFeesClientPerformanceMetricName,
} from '@/app/api/school-fees/dto/performance-metric.dto';

export interface SchoolFeesClientPerformanceMetric {
  name: SchoolFeesClientPerformanceMetricName;
  durationMs: number;
  route: string;
}

const API_WARNING_THRESHOLD_MS = 500;
const PAGE_LOAD_WARNING_THRESHOLD_MS = 3000;
const INTERACTION_WARNING_THRESHOLD_MS = 100;

@Injectable()
export class SchoolFeesPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SchoolFeesPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      baseUrl?: string;
      route?: { path?: string };
    }>();
    const response = http.getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Math.max(0, Date.now() - startedAt);
        const thresholdExceeded = durationMs > API_WARNING_THRESHOLD_MS;
        const metric = {
          metric: 'school_fees_api_ms',
          route: this.resolveRouteLabel(request),
          method: request.method || 'UNKNOWN',
          status: response.statusCode || 0,
          durationMs,
          thresholdExceeded,
        };

        if (thresholdExceeded) {
          this.logger.warn(metric);
        } else {
          this.logger.log(metric);
        }
      }),
    );
  }

  recordClientMetric(metric: SchoolFeesClientPerformanceMetric): void {
    const threshold = this.clientThreshold(metric.name);
    const thresholdExceeded = metric.durationMs > threshold;
    const structuredMetric = {
      metric: metric.name,
      route: metric.route,
      durationMs: metric.durationMs,
      thresholdExceeded,
    };

    if (thresholdExceeded) {
      this.logger.warn(structuredMetric);
    } else {
      this.logger.log(structuredMetric);
    }
  }

  private clientThreshold(
    name: SchoolFeesClientPerformanceMetricName,
  ): number {
    return name === 'school_fees_page_load_ms'
      ? PAGE_LOAD_WARNING_THRESHOLD_MS
      : INTERACTION_WARNING_THRESHOLD_MS;
  }

  private resolveRouteLabel(request: {
    baseUrl?: string;
    route?: { path?: string };
  }): string {
    const base = request.baseUrl || '/api/school-fees';
    const route = request.route?.path || '';

    return `${base}${route}`.slice(0, 120);
  }
}
