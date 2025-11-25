import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateOrderRatingDto } from './dto/create-order-rating.dto';
import { UpdateOrderRatingDto } from './dto/update-order-rating.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { OrderRating } from './schema/order-rating.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../order/schema/order.schema';

@Injectable()
export class OrderRatingService {

  constructor(
    @InjectModel(OrderRating.name) private orderRatingModel: Model<OrderRating>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}
  async create(createOrderRatingDto: CreateOrderRatingDto, userId: string) {
    if(!userId){
      throw new UnauthorizedException('User not found');
    }

    const order = await this.orderModel.findOne({ _id: createOrderRatingDto.order_id }).exec();
    if (!order) {
      throw new NotFoundException('Order not found'); 
    }

    if(order.user_id.toString() !== userId){
      throw new UnauthorizedException('You can only rate your own orders');
    }

    const existOrderRating = await this.orderRatingModel.findOne({ order_id: createOrderRatingDto.order_id }).exec();
    if (existOrderRating) {
      throw new ConflictException('Order already rated');
    }

    const orderRating = new this.orderRatingModel({
      ...createOrderRatingDto,
      user_id: new Types.ObjectId(userId),
    });


    order.is_rating = true;
    await order.save();

    return await orderRating.save();
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.orderRatingModel
        .find()
        .populate('order_id')
        .populate('user_id')
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderRatingModel.countDocuments().exec()
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid order rating ID');
    }

    const orderRating = await this.orderRatingModel.findOne({ order_id: id })
      .populate('order_id')
      .populate('user_id')
      .select('-__v')
      .exec();
    
    if (!orderRating) {
      throw new NotFoundException('Order rating not found');
    }

    return orderRating;
  }

  async update(id: string, updateOrderRatingDto: UpdateOrderRatingDto, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid order rating ID');
    }

    const orderRating = await this.orderRatingModel.findById(id).exec();
    if (!orderRating) {
      throw new NotFoundException('Order rating not found');
    }

    if (orderRating.user_id.toString() !== userId) {
      throw new UnauthorizedException('You can only update your own ratings');
    }

    const updatedOrderRating = await this.orderRatingModel
      .findByIdAndUpdate(id, updateOrderRatingDto, { new: true })
      .populate('order_id')
      .populate('user_id')
      .select('-__v')
      .exec();

    return updatedOrderRating;
  }

  async adminResponse(id: string, adminResponseDto: AdminResponseDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid order rating ID');
    }

    const orderRating = await this.orderRatingModel.findById(id).exec();
    if (!orderRating) {
      throw new NotFoundException('Order rating not found');
    }

    const updatedOrderRating = await this.orderRatingModel
      .findByIdAndUpdate(
        id,
        {
          addmin_respone: adminResponseDto.admin_response,
          addmin_respone_time: new Date()
        },
        { new: true }
      )
      .populate('order_id')
      .populate('user_id')
      .select('-__v')
      .exec();

    return updatedOrderRating;
  }
}
