import { Injectable } from '@nestjs/common';
import type {
  ChildStatus,
  FeeTemplate,
  FeeType,
} from '@/app/api/school-fees/models/school-fees.model';

export class SchoolFeesTemplateEligibilityError extends Error {
  readonly code = 'FEE_TEMPLATE_NOT_ELIGIBLE' as const;

  constructor(message = 'Template khoản thu không đủ điều kiện áp dụng.') {
    super(message);
    this.name = 'SchoolFeesTemplateEligibilityError';
  }
}

@Injectable()
export class SchoolFeesTemplateEligibilityService {
  filterEligible(
    templates: FeeTemplate[],
    status: ChildStatus,
    allowedTypes?: FeeType[],
  ): FeeTemplate[] {
    return templates.filter(
      (template) =>
        template.active &&
        (!allowedTypes || allowedTypes.includes(template.type)) &&
        (template.applicableChildStatus === null ||
          template.applicableChildStatus === status),
    );
  }

  resolveEligibleByIds(
    templates: FeeTemplate[],
    selectedIds: string[],
    status: ChildStatus,
    allowedTypes: FeeType[],
  ): FeeTemplate[] {
    const byId = new Map(templates.map((template) => [template.id, template]));

    return selectedIds.map((id) => {
      const template = byId.get(id);

      if (
        !template ||
        !template.active ||
        !allowedTypes.includes(template.type) ||
        (template.applicableChildStatus !== null &&
          template.applicableChildStatus !== status)
      ) {
        throw new SchoolFeesTemplateEligibilityError();
      }

      return structuredClone(template);
    });
  }
}
