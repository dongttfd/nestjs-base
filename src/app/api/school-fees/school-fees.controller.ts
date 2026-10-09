import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuccessEntity } from '@/common';
import { ApiAuthGuard } from '@/app/api/auth/guards';
import {
  CreateAnnualFeeItemDto,
  UpdateAnnualFeeItemDto,
} from './dto/annual-fee-item.dto';
import { CreateMonthDto } from './dto/create-month.dto';
import {
  CreateFeeTemplateDto,
  UpdateFeeTemplateDto,
} from './dto/fee-template.dto';
import {
  CreateMonthlyItemDto,
  UpdateMonthlyItemDto,
} from './dto/monthly-fee-item.dto';
import { PerformanceMetricDto } from './dto/performance-metric.dto';
import { CreateSchoolYearDto } from './dto/school-year.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { FeeTemplateEntity } from './entities/fee-template.entity';
import { MonthDetailEntity } from './entities/month-detail.entity';
import { SchoolYearEntity } from './entities/school-year.entity';
import { SchoolFeesPerformanceInterceptor } from './interceptors/school-fees-performance.interceptor';
import type { FeeType } from './models/school-fees.model';
import { SchoolFeesService } from './school-fees.service';
import { SchoolFeesOverviewService } from './services/school-fees-overview.service';
import { SchoolFeesTemplateService } from './services/school-fees-template.service';
import { SchoolYearLazyMonthService } from './services/school-year-lazy-month.service';
import { SchoolYearService } from './services/school-year.service';

const strictValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  stopAtFirstError: true,
});

@ApiTags('School Fees')
@Controller('school-fees')
@UseInterceptors(SchoolFeesPerformanceInterceptor)
export class SchoolFeesController {
  constructor(
    private readonly schoolFeesService: SchoolFeesService,
    private readonly performanceInterceptor: SchoolFeesPerformanceInterceptor,
    private readonly templateService: SchoolFeesTemplateService,
    private readonly overviewService: SchoolFeesOverviewService,
    private readonly schoolYearService: SchoolYearService,
    private readonly lazyMonthService: SchoolYearLazyMonthService,
  ) {}

  @ApiAuthGuard()
  @HttpCode(204)
  @Post('telemetry/performance')
  async recordPerformanceMetric(
    @Req() request: { body?: Record<string, unknown> },
    @Body(strictValidationPipe) body: PerformanceMetricDto,
  ): Promise<void> {
    const raw = (request.body || body) as PerformanceMetricDto &
      Record<string, unknown>;
    const keys = Object.keys(raw);
    const validKeys = ['name', 'durationMs', 'route'];
    const hasUnexpectedField = keys.some((key) => !validKeys.includes(key));
    const validName =
      raw.name === 'school_fees_page_load_ms' ||
      raw.name === 'school_fees_interaction_ms';
    const validDuration =
      typeof raw.durationMs === 'number' &&
      Number.isFinite(raw.durationMs) &&
      raw.durationMs >= 0;
    const validRoute =
      typeof raw.route === 'string' &&
      raw.route.length >= 1 &&
      raw.route.length <= 120;

    if (hasUnexpectedField || !validName || !validDuration || !validRoute) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PERFORMANCE_METRIC',
        message: 'Performance metric không hợp lệ.',
      });
    }

    this.performanceInterceptor.recordClientMetric(body);
  }

  @ApiAuthGuard()
  @Header('Cache-Control', 'no-store')
  @Get('children/default')
  async resolveDefaultChild() {
    return new SuccessEntity(
      await this.schoolFeesService.resolveDefaultChild(),
    );
  }

  @ApiAuthGuard()
  @Get('children/:childId/templates')
  async listTemplates(
    @Param('childId') childId: string,
    @Query('type') type?: FeeType,
    @Query('eligibleForChild') eligibleForChild?: string,
  ) {
    const templates = await this.templateService.list(
      childId,
      type,
      eligibleForChild === 'true',
    );

    return new SuccessEntity(
      templates.map((template) => new FeeTemplateEntity(template)),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Post('children/:childId/templates')
  async createTemplate(
    @Param('childId') childId: string,
    @Body() body: CreateFeeTemplateDto,
  ) {
    return new SuccessEntity(
      new FeeTemplateEntity(
        await this.templateService.create(childId, body),
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Put('children/:childId/templates/:templateId')
  async updateTemplate(
    @Param('childId') childId: string,
    @Param('templateId') templateId: string,
    @Body() body: UpdateFeeTemplateDto,
  ) {
    return new SuccessEntity(
      new FeeTemplateEntity(
        await this.templateService.update(childId, templateId, body),
      ),
    );
  }

  @ApiAuthGuard()
  @Delete('children/:childId/templates/:templateId')
  async deleteTemplate(
    @Param('childId') childId: string,
    @Param('templateId') templateId: string,
  ) {
    return new SuccessEntity(
      await this.templateService.delete(childId, templateId),
    );
  }

  @ApiAuthGuard()
  @Post('children/:childId/school-years/prepare')
  async prepareNextSchoolYear(@Param('childId') childId: string) {
    await this.schoolYearService.prepareNextSchoolYear(childId);

    return new SuccessEntity(
      await this.schoolFeesService.resolveChildContext(childId),
    );
  }

  @ApiAuthGuard()
  @Get('children/:childId/school-years')
  async listSchoolYears(@Param('childId') childId: string) {
    return new SuccessEntity(
      await this.overviewService.listOverviews(childId),
    );
  }

  @ApiAuthGuard()
  @Get('children/:childId/school-years/:schoolYearId')
  async getSchoolYearOverview(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
  ) {
    return new SuccessEntity(
      await this.overviewService.getOverview(childId, schoolYearId),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Post('children/:childId/school-years')
  async createSchoolYear(
    @Param('childId') childId: string,
    @Body() body: CreateSchoolYearDto,
  ) {
    return new SuccessEntity(
      new SchoolYearEntity(
        await this.schoolYearService.createSchoolYear(childId, body),
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Post('children/:childId/school-years/:schoolYearId/months/:monthKey')
  async createMonth(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
    @Body() body: CreateMonthDto,
  ) {
    return new SuccessEntity(
      await this.lazyMonthService.createMonth(
        childId,
        schoolYearId,
        monthKey,
        body.templateIds,
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Post('children/:childId/school-years/:schoolYearId/annual-items')
  async createAnnualItem(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Body() body: CreateAnnualFeeItemDto,
  ) {
    return new SuccessEntity(
      await this.schoolYearService.createAnnualItem(
        childId,
        schoolYearId,
        body,
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Put('children/:childId/school-years/:schoolYearId/annual-items/:itemId')
  async updateAnnualItem(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateAnnualFeeItemDto,
  ) {
    return new SuccessEntity(
      await this.schoolYearService.updateAnnualItem(
        childId,
        schoolYearId,
        itemId,
        body,
      ),
    );
  }

  @ApiAuthGuard()
  @Delete('children/:childId/school-years/:schoolYearId/annual-items/:itemId')
  async deleteAnnualItem(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('itemId') itemId: string,
    @Query('confirmReopenPaidMonth') confirmReopenPaidMonth?: string,
  ) {
    return new SuccessEntity(
      await this.schoolYearService.deleteAnnualItem(
        childId,
        schoolYearId,
        itemId,
        confirmReopenPaidMonth === 'true',
      ),
    );
  }

  @ApiAuthGuard()
  @Get('children/:childId/school-years/:schoolYearId/months/:monthKey')
  async getMonthDetail(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
  ) {
    return new SuccessEntity(
      new MonthDetailEntity(
        await this.schoolFeesService.getMonthDetail(
          childId,
          schoolYearId,
          monthKey,
        ),
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Put('children/:childId/school-years/:schoolYearId/months/:monthKey/attendance')
  async updateAttendance(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
    @Body() body: UpdateAttendanceDto,
  ) {
    return new SuccessEntity(
      new MonthDetailEntity(
        await this.schoolFeesService.updateAttendance(
          childId,
          schoolYearId,
          monthKey,
          body.attendanceDates,
          body.confirmReopenPaidMonth ?? false,
        ),
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Post('children/:childId/school-years/:schoolYearId/months/:monthKey/items')
  async createMonthlyItem(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
    @Body() body: CreateMonthlyItemDto,
  ) {
    return new SuccessEntity(
      new MonthDetailEntity(
        await this.schoolFeesService.createMonthlyItem(
          childId,
          schoolYearId,
          monthKey,
          body,
        ),
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Put(
    'children/:childId/school-years/:schoolYearId/months/:monthKey/items/:itemId',
  )
  async updateMonthlyItem(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateMonthlyItemDto,
  ) {
    return new SuccessEntity(
      new MonthDetailEntity(
        await this.schoolFeesService.updateMonthlyItem(
          childId,
          schoolYearId,
          monthKey,
          itemId,
          body,
        ),
      ),
    );
  }

  @ApiAuthGuard()
  @Delete(
    'children/:childId/school-years/:schoolYearId/months/:monthKey/items/:itemId',
  )
  async deleteMonthlyItem(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
    @Param('itemId') itemId: string,
    @Query('confirmReopenPaidMonth') confirmReopenPaidMonth?: string,
  ) {
    return new SuccessEntity(
      new MonthDetailEntity(
        await this.schoolFeesService.deleteMonthlyItem(
          childId,
          schoolYearId,
          monthKey,
          itemId,
          confirmReopenPaidMonth === 'true',
        ),
      ),
    );
  }

  @ApiAuthGuard()
  @UsePipes(strictValidationPipe)
  @Put(
    'children/:childId/school-years/:schoolYearId/months/:monthKey/payment-status',
  )
  async updatePaymentStatus(
    @Param('childId') childId: string,
    @Param('schoolYearId') schoolYearId: string,
    @Param('monthKey') monthKey: string,
    @Body() body: UpdatePaymentStatusDto,
  ) {
    return new SuccessEntity(
      new MonthDetailEntity(
        await this.schoolFeesService.updatePaymentStatus(
          childId,
          schoolYearId,
          monthKey,
          body.status,
        ),
      ),
    );
  }
}
