import { Controller, Post, Body } from '@nestjs/common';
import { DistanceCalculationService } from './distance-calculation.service';
import { CalculateShippingFeeDto } from './dto/calculate-shipping-fee';

@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly distanceCalculationService: DistanceCalculationService,
  ) {}

  @Post('calculate-fee')
  async calculateShippingFee(@Body() dto: CalculateShippingFeeDto) {
    return await this.distanceCalculationService.calculateDistanceAndFeeFromAddressId(
      dto.addressId,
      dto.orderTotal,
    );
  }
}
