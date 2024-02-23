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
import { ConsumptionService } from './consumption.service';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { UpdateConsumptionDto } from './dto/update-consumption.dto';
import { ConsumptionPaginationEntity } from './entities/consumption-pagination.entity';
import { ConsumptionSuccessEntity } from './entities/consumption-success.entity';

@ApiTags('Consumption')
@Controller()
export class ConsumptionController {
  constructor(private consumptionService: ConsumptionService) {}

  /**
   * Get consumptions pagination
   */
  @ApiQuery({
    name: 'date',
    type: Date,
    required: false,
    description: 'Date of last item',
  })
  @ApiPagination({})
  @ApiAuthGuard()
  @Get('consumptions')
  async list(
    @Request() request,
    @Query() paginationParams: PaginationParams,
    @Query('date') date?: Date,
  ) {
    return new ConsumptionPaginationEntity(
      await this.consumptionService.paginate(
        request.user.id,
        paginationParams,
        date,
      ),
    );
  }

  /**
   * Create consumption
   */
  @ApiBadRequestResponse()
  @ApiAuthGuard()
  @Post('consumptions')
  async create(@Request() request, @Body() consumption: CreateConsumptionDto) {
    return new ConsumptionSuccessEntity(
      await this.consumptionService.create(request.user.id, consumption),
    );
  }

  /**
   * Update consumption
   */
  @ApiParam({ name: 'id', type: String, description: 'consumption id' })
  @ApiBody({ type: UpdateConsumptionDto })
  @ApiBadRequestResponse()
  @ApiAuthGuard()
  @Put('consumptions/:id')
  async update(
    @Request() request,
    @BodyWithParam(UpdateConsumptionDto) consumption: UpdateConsumptionDto,
  ) {
    return new ConsumptionSuccessEntity(
      await this.consumptionService.update(request.user.id, consumption),
    );
  }

  /**
   * Delete consumption
   */
  @ApiParam({ name: 'id', type: String, description: 'consumption id' })
  @ApiAuthGuard()
  @Delete('consumptions/:id')
  async destroy(@Request() request, @Param('id') id: string) {
    return new ConsumptionSuccessEntity(
      await this.consumptionService.destroy(request.user.id, id),
    );
  }
}
