import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import type { Request } from 'express';
import { OrderRatingService } from './order-rating.service';
import { CreateOrderRatingDto } from './dto/create-order-rating.dto';
import { UpdateOrderRatingDto } from './dto/update-order-rating.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { UnauthorizedException } from '@nestjs/common';


@Controller('order-rating')
export class OrderRatingController {
  constructor(private readonly orderRatingService: OrderRatingService) {}

  @Post()
  create(@Body() createOrderRatingDto: CreateOrderRatingDto,@Req() req: Request,) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.orderRatingService.create(createOrderRatingDto, userId);
  }

  @UseGuards(AdminGuard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.orderRatingService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderRatingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderRatingDto: UpdateOrderRatingDto, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.orderRatingService.update(id, updateOrderRatingDto, userId);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/admin-response')
  adminResponse(@Param('id') id: string, @Body() adminResponseDto: AdminResponseDto) {
    return this.orderRatingService.adminResponse(id, adminResponseDto);
  }
}
