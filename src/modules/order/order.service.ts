import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { Product, ProductDocument } from '../catalog/schema/product.schema';
import { Address, AddressDocument } from '../address/schema/address.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Address.name)
    private addressModel: Model<AddressDocument>,
    @InjectConnection() private connection: Connection,
    private readonly inventoryService: InventoryService,
  ) {}

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const addressObjectId = this.ensureObjectId(
      createOrderDto.address_id,
      'address id',
    );

    const address = await this.addressModel.findOne({
      _id: addressObjectId,
      user_id: userObjectId,
      is_deleted: false,
      is_active: true,
    });

    if (!address) {
      throw new NotFoundException('Address not found or not accessible');
    }

    const productIds = createOrderDto.items.map((item) =>
      this.ensureObjectId(item.product_id, 'product id'),
    );

    const products = await this.productModel.find({
      _id: { $in: productIds },
      is_deleted: false,
      is_active: true,
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Some products not found or unavailable');
    }

    const insufficientStockItems: Array<{
      name: string;
      available: number;
      requested: number;
    }> = [];

    for (const item of createOrderDto.items) {
      const product = products.find(
        (p) => p._id.toString() === item.product_id,
      );

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const availableQuantity = product.quantity || 0;

      if (availableQuantity < item.quantity) {
        insufficientStockItems.push({
          name: product.name,
          available: availableQuantity,
          requested: item.quantity,
        });
      }
    }

    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems
        .map(
          (item) =>
            `${item.name}: Available ${item.available}, Requested ${item.requested}`,
        )
        .join('; ');
      throw new BadRequestException(`Insufficient stock: ${errorMessage}`);
    }

    const orderItems = createOrderDto.items.map((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.product_id,
      );

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const unitPrice = product.final_price || product.unit_price;
      const discountPercent = product.discount_percent || 0;
      const totalPrice =
        unitPrice * item.quantity * (1 - discountPercent / 100);

      return {
        product_id: product._id,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        total_price: Math.round(totalPrice),
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const discount = createOrderDto.discount || 0;
    const shippingFee = createOrderDto.shipping_fee || 0;
    const total = subtotal - discount + shippingFee;

    if (total < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = new this.orderModel({
        user_id: userObjectId,
        address_id: addressObjectId,
        items: orderItems,
        subtotal: Math.round(subtotal),
        discount: Math.round(discount),
        shipping_fee: Math.round(shippingFee),
        total: Math.round(total),
        status: 'pending',
        payment_status: 'pending',
      });

      const savedOrder = await order.save({ session });

      const orderId = (savedOrder._id as Types.ObjectId).toString();
      await this.inventoryService.exportInventoryForOrder(
        createOrderDto.items,
        orderId,
        session,
      );

      await session.commitTransaction();

      const result = await this.orderModel
        .findById(orderId)
        .populate('address_id')
        .populate('items.product_id', 'name slug image_primary unit_price');

      if (!result) {
        throw new NotFoundException('Order not found after creation');
      }

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    return await this.orderModel
      .find({
        user_id: userObjectId,
        is_deleted: false,
      })
      .populate(
        'address_id',
        'full_name phone address ward district city zip_code',
      )
      .populate(
        'items.product_id',
        'name slug image_primary unit_price final_price discount_percent stock_status',
      )
      .select(
        'user_id address_id items subtotal discount shipping_fee total status payment_status created_at updated_at',
      )
      .sort({ created_at: -1 });
  }

  async getOrderById(orderId: string, userId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const order = await this.orderModel
      .findOne({
        _id: orderObjectId,
        user_id: userObjectId,
        is_deleted: false,
      })
      .populate(
        'address_id',
        'full_name phone address ward district city zip_code',
      )
      .populate(
        'items.product_id',
        'name slug image_primary unit_price final_price discount_percent stock_status',
      );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
