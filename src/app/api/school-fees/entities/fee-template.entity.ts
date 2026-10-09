import type { FeeTemplate } from '@/app/api/school-fees/models/school-fees.model';

export class FeeTemplateEntity {
  id: string;
  name: string;
  type: FeeTemplate['type'];
  active: boolean;
  applicableChildStatus: FeeTemplate['applicableChildStatus'];
  createdAt: string;
  updatedAt: string;
  defaultAmount?: number;
  defaultMonthOffset?: number;
  priceByMonth?: Record<string, number>;

  constructor(template: FeeTemplate) {
    Object.assign(this, template);
  }
}

export class FeeTemplateCollectionEntity {
  items: FeeTemplateEntity[];

  constructor(templates: FeeTemplate[]) {
    this.items = templates.map((template) => new FeeTemplateEntity(template));
  }
}
