import { RealtimeGateway } from './realtime.gateway';
import { Injectable } from '@nestjs/common';
import {
  OrderProcessingPayload,
  OrderSuccessPayload,
  OrderErrorPayload,
  NewOrderNotificationPayload,
  OrderStatusUpdatedPayload,
} from './interfaces/order-realtime.interface';

@Injectable()
export class OrderRealtimeService {
  constructor(private readonly rt: RealtimeGateway) {}

  // Notifications for customers
  orderProcessing(userId: string, data: OrderProcessingPayload) {
    this.rt.emitToUser(userId, 'order:processing', data);
  }

  orderSuccess(userId: string, data: OrderSuccessPayload) {
    this.rt.emitToUser(userId, 'order:success', data);
  }

  orderError(userId: string, data: OrderErrorPayload) {
    this.rt.emitToUser(userId, 'order:error', data);
  }

  // Notifications for staff
  // Thông báo cho tất cả staff khi có đơn hàng mới
  notifyNewOrderToStaff(data: NewOrderNotificationPayload) {
    this.rt.emitToAllStaff('staff:new-order', data);
  }

  // Thông báo cho tất cả staff (trừ staff đã thực hiện) khi có cập nhật trạng thái
  notifyOrderStatusUpdated(
    excludeStaffId: string | undefined,
    data: OrderStatusUpdatedPayload,
  ) {
    if (excludeStaffId) {
      this.rt.emitToAllStaffExcept(excludeStaffId, 'staff:order-updated', data);
    } else {
      this.rt.emitToAllStaff('staff:order-updated', data);
    }
  }

  // Thông báo cho customer khi staff cập nhật đơn hàng
  notifyCustomerOrderUpdated(userId: string, data: OrderStatusUpdatedPayload) {
    this.rt.emitToUser(userId, 'order:status-updated', data);
  }
}
