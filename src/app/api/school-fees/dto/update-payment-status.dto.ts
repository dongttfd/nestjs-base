import { IsIn } from 'class-validator';
import { PaymentStatus } from '@/app/api/school-fees/models/school-fees.model';

export class UpdatePaymentStatusDto {
  @IsIn(['UNPAID', 'PAID'])
  status!: PaymentStatus;
}
