import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShipperService } from './shipper.service';
import { SetOnlineStatusDto } from './dto/set-online-status.dto';
import { ShipperGuard } from '../../common/guards/shipper.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { CreateShipperDto } from './dto/create-shipper-dto.dto';
import { SkipShipperGuard } from '../../common/decorators/skip-shipper-guard.decorator';

@Controller('shipper')
@UseGuards(ShipperGuard)
export class ShipperController {
  constructor(private readonly shipperService: ShipperService) {}

  @Post()
  @SkipShipperGuard()
  @UseGuards(AdminGuard)
  async createForUser(@Request() req: any, @Body() dto: CreateShipperDto) {
    return await this.shipperService.createForUser(dto?.user_id);
  }

  @Post('status')
  async setOnlineStatus(
    @Request() req: any,
    @Body() setOnlineStatusDto: SetOnlineStatusDto,
  ) {
    const userId = req.user.id;
    return await this.shipperService.setOnlineStatus(
      userId,
      setOnlineStatusDto,
    );
  }

  @Get('status')
  async getStatus(@Request() req: any) {
    const userId = req.user.id;
    return await this.shipperService.getShipperStatus(userId);
  }

  @Get('orders')
  async getOrders(@Request() req: any, @Query('status') status?: string) {
    const userId = req.user.id;
    return await this.shipperService.getShipperOrders(userId, status);
  }

  @Patch('orders/:id/accept')
  async acceptOrder(@Request() req: any, @Param('id') orderId: string) {
    const userId = req.user.id;
    return await this.shipperService.assignOrderToShipper(orderId, userId);
  }

  @Patch('orders/:id/start-delivery')
  async startDelivery(@Request() req: any, @Param('id') orderId: string) {
    const userId = req.user.id;
    return await this.shipperService.startDelivery(orderId, userId);
  }

  @Patch('orders/:id/complete')
  async completeDelivery(@Request() req: any, @Param('id') orderId: string) {
    const userId = req.user.id;
    return await this.shipperService.completeDelivery(orderId, userId);
  }
}
