import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from '../order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Types, Document, Model } from 'mongoose';
import { OrderRealtimeService } from 'src/modules/realtime/order-realtime.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationRealtimeService } from 'src/modules/realtime/notification-realtime.service';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';
import { Order } from '../schema/order.schema';

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
    private readonly notificationService: NotificationService,
    private readonly notificationRealtimeService: NotificationRealtimeService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

      // Thông báo cho customer
      this.orderRealtimeService.orderSuccess(userId, {
        jobId: job.id as string,
        orderId,
        message: 'Đơn hàng đã được tạo thành công',
        order,
      });

      // Thông báo cho tất cả staff đang online về đơn hàng mới
      this.orderRealtimeService.notifyNewOrderToStaff({
        orderId,
        userId,
        order,
        message: 'Có đơn hàng mới cần xử lý',
        timestamp: new Date(),
      });
      this.logger.log(`Notified all staff about new order ${orderId}`);

      // Lấy thông tin customer để dùng làm actor
      const customer = await this.userModel
        .findById(userId)
        .select('name avatar email')
        .lean();

      // Lấy danh sách tất cả staff
      const staffUsers = await this.userModel
        .find({ role: 'staff' })
        .select('_id')
        .lean();

      // Tạo notification cho mỗi staff
      if (staffUsers.length > 0 && customer) {
        const orderData = order as unknown as Order;
        const orderTotal = orderData.total || 0;
        const orderItemsCount = orderData.items?.length || 0;

        // Tạo notification cho từng staff
        for (const staff of staffUsers) {
          try {
            const notification =
              await this.notificationService.createNotification({
                user_id: staff._id as unknown as Types.ObjectId,
                actor_id: new Types.ObjectId(userId),
                type: 'order_update',
                title: 'Có đơn hàng mới cần xử lý',
                message: `Khách hàng ${customer.name} vừa đặt đơn hàng #${orderId} với ${orderItemsCount} sản phẩm, tổng giá trị ${Number(orderTotal).toLocaleString('vi-VN')}đ`,
                link: `/staff/orders/${orderId}`,
                reference_id: orderId,
                reference_type: 'order',
                metadata: {
                  order_id: orderId,
                  customer_id: userId,
                  customer_name: customer.name,
                  total: orderTotal,
                  items_count: orderItemsCount,
                },
              });

            // Gửi thông báo realtime cho staff
            if (notification) {
              const staffId = staff._id.toString();
              this.notificationRealtimeService.notifyUser(staffId, {
                notificationId: (notification as unknown as { _id: string })
                  ._id,
                type: 'order_update',
                title: 'Có đơn hàng mới cần xử lý',
                message: `Khách hàng ${customer.name} vừa đặt đơn hàng #${orderId}`,
                link: `/staff/orders/${orderId}`,
                actor: {
                  id: userId,
                  name: customer.name,
                  avatar: customer.avatar,
                },
                timestamp: new Date(),
                metadata: {
                  order_id: orderId,
                  customer_name: customer.name,
                },
              });
            }
          } catch (error) {
            const staffId = staff._id.toString();
            this.logger.error(
              `Failed to create notification for staff ${staffId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

        this.logger.log(
          `Created notifications for ${staffUsers.length} staff members about order ${orderId}`,
        );
      }

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
