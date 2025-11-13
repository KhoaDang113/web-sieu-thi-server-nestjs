import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Query,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StaffGuard } from '../../common/guards/staff.guard';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    @InjectQueue('order-queue') private readonly orderQueue: Queue,
  ) {}

  @Post()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    const job = await this.orderQueue.add(
      'create-order',
      {
        userId,
        createOrderDto,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    return {
      success: true,
      message: 'Order is being processed',
      jobId: job.id,
      estimatedTime: '5-10 seconds',
    };
  }

  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    const job = await this.orderQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = state === 'completed' ? await job.returnvalue : null;

    return {
      jobId: job.id,
      state,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result,
      error: state === 'failed' ? job.failedReason : null,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }

  @Get()
  async getMyOrders(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.orderService.getOrdersByUser(userId);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.orderService.getOrderById(id, userId);
  }

  // User hủy đơn hàng
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body?: { cancel_reason?: string },
    @Req() req?: Request,
  ) {
    const userId = req?.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.orderService.cancelOrderByUser(
      id,
      userId,
      body?.cancel_reason,
    );
  }

  // Lấy tất cả đơn hàng (staff/admin)
  @Get('admin/all')
  @UseGuards(StaffGuard)
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return await this.orderService.getAllOrders(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  // Staff xác nhận đơn hàng
  @Patch('admin/:id/confirm')
  @UseGuards(StaffGuard)
  async confirmOrder(@Param('id') id: string) {
    return await this.orderService.confirmOrder(id);
  }

  // Staff cập nhật đang giao hàng
  @Patch('admin/:id/ship')
  @UseGuards(StaffGuard)
  async shipOrder(@Param('id') id: string) {
    return await this.orderService.shipOrder(id);
  }

  // Staff xác nhận giao hàng thành công
  @Patch('admin/:id/deliver')
  @UseGuards(StaffGuard)
  async deliverOrder(@Param('id') id: string) {
    return await this.orderService.deliverOrder(id);
  }

  // Staff hủy đơn hàng
  @Patch('admin/:id/cancel')
  @UseGuards(StaffGuard)
  async cancelOrderByStaff(
    @Param('id') id: string,
    @Body() body: { cancel_reason: string },
  ) {
    if (!body) {
      throw new UnauthorizedException('Body is required');
    }
    if (!body.cancel_reason) {
      throw new UnauthorizedException('Cancel reason is required');
    }
    return await this.orderService.cancelOrderByStaff(id, body.cancel_reason);
  }
}
