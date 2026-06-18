import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  CLASSIFIER_TIMEOUT_BATCH_BASE,
  CLASSIFIER_TIMEOUT_BATCH_PER_ITEM,
  CLASSIFIER_TIMEOUT_SINGLE,
} from '@/config';

export interface ClassifyResult {
  category: string;
  confidence: number;
}

export interface BatchClassifyResult extends ClassifyResult {
  id: string;
}

const FALLBACK_RESULT: ClassifyResult = { category: 'other', confidence: 0 };

@Injectable()
export class AiClassifierClientService {
  private readonly logger = new Logger(AiClassifierClientService.name);
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get(
      'CLASSIFIER_SERVICE_URL',
      'http://classifier:8000',
    );
  }

  /**
   * Classify a single consumption title.
   * Always returns a result - falls back to { category: 'other', confidence: 0 } on error.
   */
  async classify(text: string): Promise<ClassifyResult> {
    if (!text || text.trim().length === 0) {
      return FALLBACK_RESULT;
    }

    try {
      const response = await axios.post<ClassifyResult>(
        `${this.baseUrl}/api/classify`,
        { text },
        { timeout: CLASSIFIER_TIMEOUT_SINGLE },
      );

      if (!response.data?.category) {
        this.logger.warn(`AI Classifier response is missing category for: "${text}"`);

        return FALLBACK_RESULT;
      }

      return response.data;
    } catch (error) {
      this.handleError('classify', text, error);

      return FALLBACK_RESULT;
    }
  }

  /**
   * Classify a batch of consumption titles.
   * On error, returns all items with category = 'other'.
   */
  async classifyBatch(
    items: Array<{ id: string; text: string }>,
  ): Promise<BatchClassifyResult[]> {
    if (!items || items.length === 0) {
      return [];
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/classify-batch`,
        { items },
        {
          timeout: Math.max(
            CLASSIFIER_TIMEOUT_BATCH_BASE,
            items.length * CLASSIFIER_TIMEOUT_BATCH_PER_ITEM,
          ),
        }, // scale timeout based on batch size
      );

      if (!response.data?.results || !Array.isArray(response.data.results)) {
        this.logger.warn('AI Classifier batch response is missing results');

        return this.buildFallbackBatch(items);
      }

      return response.data.results;
    } catch (error) {
      this.handleError('classifyBatch', `${items.length} items`, error);

      return this.buildFallbackBatch(items);
    }
  }

  /**
   * Log detailed error messages based on the specific failure case.
   */
  private handleError(method: string, context: string, error: unknown): void {
    if (!axios.isAxiosError(error)) {
      this.logger.error(
        `[${method}] Unknown error for "${context}": ${(error as Error).message}`,
      );

      return;
    }

    const axiosError = error as AxiosError;

    // Case 1: Timeout — classifier service taking too long
    if (axiosError.code === 'ECONNABORTED') {
      this.logger.warn(
        `[${method}] ⏱️ Timeout when calling classifier for "${context}". ` +
        `The service might be overloaded or the model is too large.`,
      );

      return;
    }

    // Case 2: Connection refused — classifier service not running or crashed
    if (axiosError.code === 'ECONNREFUSED') {
      this.logger.error(
        `[${method}] 🔌 Cannot connect to classifier service at ${this.baseUrl}. ` +
        `Check if container "classifier" is running.`,
      );

      return;
    }

    // Case 3: DNS resolution failed — wrong host name or network issue
    if (axiosError.code === 'ENOTFOUND') {
      this.logger.error(
        `[${method}] 🌐 Host "${this.baseUrl}" not found. ` +
        `Check docker network configuration and service name in docker-compose.`,
      );

      return;
    }

    // Case 4: HTTP 4xx/5xx — classifier service returned an error response
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = JSON.stringify(axiosError.response.data);

      if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
        // Validation error — invalid input
        this.logger.warn(
          `[${method}] ⚠️ Classifier rejected input "${context}": ${data}`,
        );
      } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        // Server error — model not loaded or internal service failure
        this.logger.error(
          `[${method}] 💥 Classifier service error ${status} for "${context}": ${data}`,
        );
      } else {
        this.logger.error(
          `[${method}] ❌ Classifier returned HTTP status ${status} for "${context}": ${data}`,
        );
      }

      return;
    }

    // Case 5: Other network errors (network unreachable, socket hang up, etc.)
    this.logger.error(
      `[${method}] 🔥 Network error for "${context}": ${axiosError.message}`,
    );
  }

  private buildFallbackBatch(
    items: Array<{ id: string; text: string }>,
  ): BatchClassifyResult[] {
    return items.map((item) => ({
      id: item.id,
      category: 'other',
      confidence: 0,
    }));
  }
}
