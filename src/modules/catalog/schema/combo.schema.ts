import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ComboDocument = Combo & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Combo {
  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;
}

export const ComboSchema = SchemaFactory.createForClass(Combo);
