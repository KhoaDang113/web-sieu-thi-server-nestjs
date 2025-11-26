import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shipper, ShipperDocument } from './schema/shipper.schema';
import { Order, OrderDocument } from '../order/schema/order.schema';
import { SetOnlineStatusDto } from './dto/set-online-status.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ShipperService {
  constructor(
    @InjectModel(Shipper.name)
    private readonly shipperModel: Model<ShipperDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  async createForUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const user = await this.userModel.findById(userObjectId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.shipperModel.findOne({ user_id: userObjectId });
    if (existing) {
      throw new BadRequestException('User is already a shipper');
    }

    const shipper = await this.shipperModel.create({
      user_id: userObjectId,
      is_online: false,
      is_deleted: false,
    });

    return shipper;
  }

  async setOnlineStatus(
    userId: string,
    setOnlineStatusDto: SetOnlineStatusDto,
  ): Promise<Shipper> {
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const location = setOnlineStatusDto.latitude &&
      setOnlineStatusDto.longitude
      ? {
          latitude: setOnlineStatusDto.latitude,
          longitude: setOnlineStatusDto.longitude,
          address: setOnlineStatusDto.address,
        }
      : undefined;

    const shipper = await this.shipperModel.findOneAndUpdate(
      { user_id: userObjectId },
      {
        is_online: setOnlineStatusDto.is_online,
        last_online_at: setOnlineStatusDto.is_online ? new Date() : undefined,
        ...(location && { current_location: location }),
      },
      { upsert: true, new: true },
    );

    return shipper;
  }

  async getShipperStatus(userId: string): Promise<Shipper | null> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    return await this.shipperModel.findOne({
      user_id: userObjectId,
      is_deleted: false,
    });
  }

  async getOnlineShippers(): Promise<Shipper[]> {
    return await this.shipperModel
      .find({
        is_online: true,
        is_deleted: false,
      })
      .populate('user_id', 'name email phone avatar');
  }

  async getShipperOrders(
    userId: string,
    status?: string,
  ): Promise<Order[]> {
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const filter: any = {
      shipper_id: userObjectId,
      is_deleted: false,
    };

    // If status is provided, filter by it
    // Otherwise, return confirmed and shipped orders (not delivered/cancelled)
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['confirmed', 'shipped'] };
    }

    return await this.orderModel
      .find(filter)
      .populate('address_id', 'full_name phone address ward district city')
      .populate(
        'items.product_id',
        'name slug image_primary images unit_price unit',
      )
      .sort({ created_at: -1 });
  }

  async assignOrderToShipper(
    orderId: string,
    shipperId: string,
  ): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const shipperObjectId = this.ensureObjectId(shipperId, 'shipper id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot assign order with status: ${order.status}`,
      );
    }

    if (order.shipper_id) {
      throw new BadRequestException('Order already assigned to a shipper');
    }

    order.shipper_id = shipperObjectId;
    order.assigned_at = new Date();
    await order.save();

    const result = await this.orderModel
      .findById(orderId)
      .populate('address_id')
      .populate('items.product_id', 'name slug image_primary unit_price')
      .populate('shipper_id', 'name phone');

    if (!result) {
      throw new NotFoundException('Order not found after assignment');
    }

    return result;
  }

  async startDelivery(orderId: string, shipperId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const shipperObjectId = this.ensureObjectId(shipperId, 'shipper id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      shipper_id: shipperObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot start delivery for order with status: ${order.status}`,
      );
    }

    order.status = 'shipped';
    order.shipped_at = new Date();
    await order.save();

    const result = await this.orderModel
      .findById(orderId)
      .populate('address_id')
      .populate('items.product_id', 'name slug image_primary unit_price');

    if (!result) {
      throw new NotFoundException('Order not found after starting delivery');
    }

    return result;
  }

  async completeDelivery(orderId: string, shipperId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const shipperObjectId = this.ensureObjectId(shipperId, 'shipper id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      shipper_id: shipperObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status !== 'shipped') {
      throw new BadRequestException(
        `Cannot complete delivery for order with status: ${order.status}`,
      );
    }

    order.status = 'delivered';
    order.delivered_at = new Date();
    order.payment_status = 'paid';
    order.paid_at = new Date();
    await order.save();

    const result = await this.orderModel
      .findById(orderId)
      .populate('address_id')
      .populate('items.product_id', 'name slug image_primary unit_price');

    if (!result) {
      throw new NotFoundException('Order not found after completion');
    }

    return result;
  }
}
