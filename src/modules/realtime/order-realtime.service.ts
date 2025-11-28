import { RealtimeGateway } from './realtime.gateway';
import { Injectable } from '@nestjs/common';
import {
  OrderProcessingPayload,
  OrderSuccessPayload,
  OrderErrorPayload,
  NewOrderPayload,
  NewOrderToShipperPayload,
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

  newOrderToStaff(data: NewOrderPayload) {
    this.rt.emitToAllStaff('order:new', data);
  }

  newOrderToShipper(data: NewOrderToShipperPayload) {
    this.rt.emitToShipper(data.shipperId, 'order:new', data);
  }
}
