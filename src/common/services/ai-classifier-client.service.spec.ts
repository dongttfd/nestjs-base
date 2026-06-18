import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios, { AxiosError } from 'axios';
import {
  CLASSIFIER_TIMEOUT_BATCH_BASE,
  CLASSIFIER_TIMEOUT_BATCH_PER_ITEM,
  CLASSIFIER_TIMEOUT_SINGLE,
} from '@/config';
import { AiClassifierClientService } from './ai-classifier-client.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiClassifierClientService', () => {
  let service: AiClassifierClientService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    const configServiceMock = {
      get: jest.fn().mockReturnValue('http://localhost:8000'),
    };

    mockedAxios.isAxiosError = jest.fn().mockImplementation((err: any) => !!err?.isAxiosError) as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiClassifierClientService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AiClassifierClientService>(AiClassifierClientService);

    // Spy on logger to verify output and suppress it in console output during test execution
    loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
    loggerWarnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});
  });

  describe('classify', () => {
    it('should return fallback result immediately and not call HTTP if input is empty, null, or whitespace', async () => {
      const fallbackResult = { category: 'other', confidence: 0 };

      expect(await service.classify('')).toEqual(fallbackResult);
      expect(await service.classify('   ')).toEqual(fallbackResult);
      expect(await service.classify(null as any)).toEqual(fallbackResult);
      expect(await service.classify(undefined as any)).toEqual(fallbackResult);

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return API response if call is successful and contains category', async () => {
      const apiResponse = { category: 'essential', confidence: 0.95 };
      mockedAxios.post.mockResolvedValueOnce({ data: apiResponse });

      const result = await service.classify('pho bo');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/classify',
        { text: 'pho bo' },
        { timeout: CLASSIFIER_TIMEOUT_SINGLE },
      );
      expect(result).toEqual(apiResponse);
    });

    it('should log warn and return fallback if API response lacks category', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { confidence: 0.8 } });

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI Classifier response is missing category for: "pho bo"'),
      );
    });

    it('should handle timeout (ECONNABORTED) and return fallback', async () => {
      const axiosError = new Error('timeout') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] ⏱️ Timeout when calling classifier for "pho bo"'),
      );
    });

    it('should handle Connection Refused (ECONNREFUSED) and return fallback', async () => {
      const axiosError = new Error('connection refused') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] 🔌 Cannot connect to classifier service'),
      );
    });

    it('should handle DNS ENOTFOUND and return fallback', async () => {
      const axiosError = new Error('dns failed') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.code = 'ENOTFOUND';
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] 🌐 Host "http://localhost:8000" not found'),
      );
    });

    it('should handle HTTP 422 validation error and return fallback', async () => {
      const axiosError = new Error('Unprocessable Entity') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        data: { detail: 'invalid' },
      } as any;
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] ⚠️ Classifier rejected input "pho bo"'),
      );
    });

    it('should handle HTTP 500+ server error and return fallback', async () => {
      const axiosError = new Error('Internal Server Error') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        data: { error: 'crashed' },
      } as any;
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] 💥 Classifier service error 500 for "pho bo"'),
      );
    });

    it('should handle other HTTP error statuses and return fallback', async () => {
      const axiosError = new Error('Bad Request') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: HttpStatus.BAD_REQUEST,
        data: 'bad stuff',
      } as any;
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] ❌ Classifier returned HTTP status 400 for "pho bo"'),
      );
    });

    it('should handle general axios error and return fallback', async () => {
      const axiosError = new Error('Generic error') as AxiosError;
      axiosError.isAxiosError = true;
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] 🔥 Network error for "pho bo"'),
      );
    });

    it('should handle non-axios errors and return fallback', async () => {
      const error = new Error('Some non-axios runtime error');
      mockedAxios.post.mockRejectedValueOnce(error);

      const result = await service.classify('pho bo');

      expect(result).toEqual({ category: 'other', confidence: 0 });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classify] Unknown error for "pho bo": Some non-axios runtime error'),
      );
    });
  });

  describe('classifyBatch', () => {
    it('should return empty list immediately and not call HTTP if input list is empty', async () => {
      const result = await service.classifyBatch([]);
      expect(result).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should call batch API with scaled timeout and return results if successful', async () => {
      const items = [
        { id: '1', text: 'rent' },
        { id: '2', text: 'bus' },
      ];
      const results = [
        { id: '1', category: 'housing', confidence: 1.0 },
        { id: '2', category: 'transport', confidence: 0.9 },
      ];
      mockedAxios.post.mockResolvedValueOnce({ data: { results } });

      const result = await service.classifyBatch(items);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/classify-batch',
        { items },
        { timeout: CLASSIFIER_TIMEOUT_BATCH_BASE }, // Max(10000, 2 * 100) = 10000
      );
      expect(result).toEqual(results);
    });

    it('should use dynamic timeout based on size when it exceeds 10s', async () => {
      const items = Array.from({ length: 120 }, (_, i) => ({ id: `${i}`, text: `item ${i}` }));
      mockedAxios.post.mockResolvedValueOnce({ data: { results: [] } });

      await service.classifyBatch(items);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/classify-batch',
        { items },
        { timeout: 120 * CLASSIFIER_TIMEOUT_BATCH_PER_ITEM }, // 120 * 100 = 12000
      );
    });

    it('should return fallback batch and log warning if response results is missing', async () => {
      const items = [
        { id: '1', text: 'rent' },
        { id: '2', text: 'bus' },
      ];
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      const result = await service.classifyBatch(items);

      expect(result).toEqual([
        { id: '1', category: 'other', confidence: 0 },
        { id: '2', category: 'other', confidence: 0 },
      ]);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI Classifier batch response is missing results'),
      );
    });

    it('should return fallback batch and log error if batch API fails', async () => {
      const items = [
        { id: '1', text: 'rent' },
        { id: '2', text: 'bus' },
      ];
      const axiosError = new Error('ECONNREFUSED') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await service.classifyBatch(items);

      expect(result).toEqual([
        { id: '1', category: 'other', confidence: 0 },
        { id: '2', category: 'other', confidence: 0 },
      ]);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[classifyBatch] 🔌 Cannot connect to classifier service at http://localhost:8000'),
      );
    });
  });
});
