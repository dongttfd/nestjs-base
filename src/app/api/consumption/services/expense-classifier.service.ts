import { Injectable } from '@nestjs/common';
import { ExpenseOverviewCategoryKey } from '@/app/api/consumption/constants/expense-categories';
import {
  EXPENSE_CLASSIFIER_RULES,
  EXPENSE_CLASSIFIER_TIEBREAK_PRIORITY,
} from '@/app/api/consumption/constants/expense-classifier-rules';
import { normalizeExpenseClassificationText } from '@/app/api/consumption/utils/expense-classifier-normalizer.util';

@Injectable()
export class ExpenseClassifierService {
  classify(title: string | null | undefined): ExpenseOverviewCategoryKey {
    const normalizedTitle = normalizeExpenseClassificationText(title);

    if (!normalizedTitle) {
      return 'other';
    }

    const matchedRule = EXPENSE_CLASSIFIER_RULES
      .filter((rule) => rule.patterns.some((pattern) => pattern.test(normalizedTitle)))
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return EXPENSE_CLASSIFIER_TIEBREAK_PRIORITY[left.key]
          - EXPENSE_CLASSIFIER_TIEBREAK_PRIORITY[right.key];
      })[0];

    return matchedRule?.key ?? 'other';
  }
}
