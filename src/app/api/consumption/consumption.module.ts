import { Module } from '@nestjs/common';
import { AiClassifierClientService } from '@/common/services/ai-classifier-client.service';
import { ConsumptionController } from './consumption.controller';
import { ConsumptionService } from './consumption.service';
import { ExpenseOverviewAggregateService } from './services/expense-overview-aggregate.service';
import { ExpenseOverviewSnapshotService } from './services/expense-overview-snapshot.service';

@Module({
  controllers: [ConsumptionController],
  providers: [
    ConsumptionService,
    AiClassifierClientService,
    ExpenseOverviewAggregateService,
    ExpenseOverviewSnapshotService,
  ],
})
export class ConsumptionModule {}
