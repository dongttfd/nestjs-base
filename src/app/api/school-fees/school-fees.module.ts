import { Module } from '@nestjs/common';
import { SchoolFeesPerformanceInterceptor } from './interceptors/school-fees-performance.interceptor';
import { JsonSchoolFeesRepository } from './repositories/json-school-fees.repository';
import { SchoolFeesController } from './school-fees.controller';
import { SchoolFeesService } from './school-fees.service';
import { SchoolFeesCalculatorService } from './services/school-fees-calculator.service';
import { SchoolFeesOverviewService } from './services/school-fees-overview.service';
import { SchoolFeesSnapshotService } from './services/school-fees-snapshot.service';
import { SchoolFeesTemplateEligibilityService } from './services/school-fees-template-eligibility.service';
import { SchoolFeesTemplateService } from './services/school-fees-template.service';
import { SchoolYearLazyMonthService } from './services/school-year-lazy-month.service';
import { SchoolYearService } from './services/school-year.service';

@Module({
  controllers: [SchoolFeesController],
  providers: [
    SchoolFeesService,
    SchoolFeesPerformanceInterceptor,
    JsonSchoolFeesRepository,
    SchoolFeesCalculatorService,
    SchoolFeesOverviewService,
    SchoolFeesTemplateEligibilityService,
    SchoolFeesTemplateService,
    SchoolFeesSnapshotService,
    SchoolYearService,
    SchoolYearLazyMonthService,
  ],
  exports: [
    SchoolFeesService,
    SchoolFeesPerformanceInterceptor,
    JsonSchoolFeesRepository,
    SchoolFeesCalculatorService,
    SchoolFeesOverviewService,
    SchoolFeesTemplateEligibilityService,
    SchoolFeesTemplateService,
    SchoolFeesSnapshotService,
    SchoolYearService,
    SchoolYearLazyMonthService,
  ],
})
export class SchoolFeesModule {}
