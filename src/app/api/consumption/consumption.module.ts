import { Module } from '@nestjs/common';
import { ConsumptionController } from './consumption.controller';
import { ConsumptionService } from './consumption.service';
import { ExpenseClassifierService } from './services/expense-classifier.service';
import { ExpenseOverviewAggregateService } from './services/expense-overview-aggregate.service';
import { ExpenseOverviewSnapshotService } from './services/expense-overview-snapshot.service';

@Module({
  controllers: [ConsumptionController],
  providers: [
    ConsumptionService,
    ExpenseClassifierService,
    ExpenseOverviewAggregateService,
    ExpenseOverviewSnapshotService,
  ],
})
export class ConsumptionModule {}
