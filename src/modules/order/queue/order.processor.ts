import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from '../order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Types, Document } from 'mongoose';
import { OrderRealtimeService } from 'src/modules/realtime/order-realtime.service';

interface OrderJobData {
  userId: string;
  createOrderDto: CreateOrderDto;
}

@Processor('order-queue')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly orderRealtimeService: OrderRealtimeService,
  ) {
    super();
  }

  async process(job: Job<OrderJobData>): Promise<any> {
    const { userId, createOrderDto } = job.data;

    this.logger.log(`Processing order for user ${userId}, Job ID: ${job.id}`);
    this.logger.log(`Items: ${JSON.stringify(createOrderDto.items)}`);

    this.orderRealtimeService.orderProcessing(userId, {
      jobId: job.id as string,
      message: 'Đang xử lý đơn hàng',
    });

    try {
      const order = await this.orderService.createOrder(userId, createOrderDto);

      const orderDoc = order as unknown as Document & { _id: Types.ObjectId };
      const orderId = orderDoc._id.toString();
      this.logger.log(`Order ${orderId} created successfully`);

      this.orderRealtimeService.orderSuccess(userId, {
        jobId: job.id as string,
        orderId,
        message: 'Đơn hàng đã được tạo thành công',
        order,
      });

      return {
        success: true,
        orderId: orderId,
        message: 'Order created successfully',
        order,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to create order: ${errorMessage}`, errorStack);

      this.orderRealtimeService.orderError(userId, {
        jobId: job.id as string,
        message: errorMessage,
        error: errorMessage,
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(errorMessage);
    }
  }
}
