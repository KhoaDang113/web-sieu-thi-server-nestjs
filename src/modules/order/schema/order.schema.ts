import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true })
  unit_price: number;

  @Prop({ type: Number, default: 0 })
  discount_percent: number;

  @Prop({ type: Number, required: true })
  total_price: number;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  address_id: Types.ObjectId;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ required: true })
  subtotal: number;

  @Prop()
  discount: number;

  @Prop()
  shipping_fee: number;

  @Prop()
  total: number;

  @Prop({ enum: ['pending', 'paid', 'failed'], default: 'pending' })
  payment_status: string;

  @Prop({ type: Date, default: null })
  paid_at: Date;

  @Prop({ type: Date, default: null })
  shipped_at: Date;

  @Prop({ type: Date, default: null })
  delivered_at: Date;

  @Prop({ type: Date, default: null })
  cancelled_at: Date;

  @Prop({ type: String, default: null })
  cancel_reason: string;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
