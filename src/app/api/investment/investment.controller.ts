import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiBadRequestResponse, ApiPagination, BodyWithParam } from '@/common';
import { ApiAuthGuard } from '@/app/api/auth/guards';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentAmountGroupMonthCollectionEntity } from './entities/investment-amount-group-month-collection.entity';
import { InvestmentAmountGroupYearCollectionEntity } from './entities/investment-amount-group-year-collection.entity';
import { InvestmentPaginationEntity } from './entities/investment-pagination.entity';
import { InvestmentSuccessEntity } from './entities/investment-success.entity';
import { InvestmentService } from './investment.service';

@ApiTags('Investment')
@Controller()
export class InvestmentController {
  constructor(private investmentService: InvestmentService) { }

  /**
   * Get investments pagination
   */
  @ApiQuery({
    name: 'date',
    type: Date,
    required: false,
    description: 'Date of last item',
  })
  @ApiQuery({
    name: 'createdAt',
    type: Date,
    required: false,
    description: 'Created At of last item',
  })
  @ApiPagination({})
  @ApiAuthGuard()
  @Get('investments')
  async list(
    @Request() request,
    @Query() paginationParams: PaginationWithDateQueryParams,
  ) {
    return new InvestmentPaginationEntity(
      await this.investmentService.paginate(
        request.user.id,
        paginationParams
      ),
    );
  }

  /**
   * Create investment
   */
  @ApiBadRequestResponse()
  @ApiAuthGuard()
  @Post('investments')
  async create(@Request() request, @Body() investment: CreateInvestmentDto) {
    return new InvestmentSuccessEntity(
      await this.investmentService.create(request.user.id, investment),
    );
  }

  /**
   * Update investment
   */
  @ApiParam({ name: 'id', type: String, description: 'investment id' })
  @ApiBody({ type: UpdateInvestmentDto })
  @ApiBadRequestResponse()
  @ApiAuthGuard()
  @Put('investments/:id')
  async update(
    @Request() request,
    @BodyWithParam(UpdateInvestmentDto) investment: UpdateInvestmentDto,
  ) {
    return new InvestmentSuccessEntity(
      await this.investmentService.update(request.user.id, investment),
    );
  }

  /**
   * Delete investment
   */
  @ApiParam({ name: 'id', type: String, description: 'investment id' })
  @ApiAuthGuard()
  @Delete('investments/:id')
  async destroy(@Request() request, @Param('id') id: string) {
    return new InvestmentSuccessEntity(
      await this.investmentService.destroy(request.user.id, id),
    );
  }

  /**
   * Investment statistic by month
   */
  @ApiAuthGuard()
  @Get('investments/statistic-by-month')
  async getInvestmentStatisticMonth(@Request() request) {
    return new InvestmentAmountGroupMonthCollectionEntity(
      await this.investmentService.getStatisticByMonth(request.user.id)
    );
  }

  /**
   * Investment statistic by year
   */
  @ApiAuthGuard()
  @Get('investments/statistic-by-year')
  async getInvestmentStatisticYear(@Request() request) {
    return new InvestmentAmountGroupYearCollectionEntity(
      await this.investmentService.getStatisticByYear(request.user.id)
    );
  }
}
