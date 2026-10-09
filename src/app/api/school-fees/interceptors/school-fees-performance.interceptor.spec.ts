import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { SchoolFeesPerformanceInterceptor } from './school-fees-performance.interceptor';

describe('SchoolFeesPerformanceInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs structured API duration without userId or request business payload', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1120);

    const interceptor = new SchoolFeesPerformanceInterceptor();
    const request = {
      method: 'PUT',
      baseUrl: '/api/school-fees',
      route: { path: '/children/:childId/school-years/:schoolYearId/months/:monthKey/attendance' },
      user: { id: 'private-user-id' },
      body: { attendanceDates: ['2026-09-01'], amount: 999999 },
    };
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ ok: true }),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, next));

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_api_ms',
        route: expect.stringContaining('/school-fees'),
        status: 200,
        durationMs: 120,
        thresholdExceeded: false,
      }),
    );
    const serialized = JSON.stringify(logSpy.mock.calls);
    expect(serialized).not.toContain('private-user-id');
    expect(serialized).not.toContain('999999');
    expect(serialized).not.toContain('attendanceDates');
  });

  it('warns when API duration exceeds 500ms', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1501);

    const interceptor = new SchoolFeesPerformanceInterceptor();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          baseUrl: '/api/school-fees',
          route: { path: '/children/default' },
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of({}) } as CallHandler),
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_api_ms',
        durationMs: 501,
        thresholdExceeded: true,
      }),
    );
  });

  it('uses safe fallback labels when request metadata is missing', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(1990);

    const interceptor = new SchoolFeesPerformanceInterceptor();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of({}) } as CallHandler),
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/api/school-fees',
        method: 'UNKNOWN',
        status: 0,
        durationMs: 0,
        thresholdExceeded: false,
      }),
    );
  });

  it('logs allowlisted frontend metrics and warns at constitution thresholds', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const interceptor = new SchoolFeesPerformanceInterceptor();

    interceptor.recordClientMetric({
      name: 'school_fees_interaction_ms',
      durationMs: 80,
      route: '/account/school-fees',
    });
    interceptor.recordClientMetric({
      name: 'school_fees_page_load_ms',
      durationMs: 2999,
      route: '/account/school-fees',
    });
    interceptor.recordClientMetric({
      name: 'school_fees_interaction_ms',
      durationMs: 101,
      route: '/account/school-fees/month',
    });
    interceptor.recordClientMetric({
      name: 'school_fees_page_load_ms',
      durationMs: 3001,
      route: '/account/school-fees',
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_interaction_ms',
        thresholdExceeded: false,
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_page_load_ms',
        thresholdExceeded: false,
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_interaction_ms',
        thresholdExceeded: true,
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_page_load_ms',
        thresholdExceeded: true,
      }),
    );
  });
});
