import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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

    return {
      jobId: job.id,
      state,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result: state === 'completed' ? await job.returnvalue : null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
}
