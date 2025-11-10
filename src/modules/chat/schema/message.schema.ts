import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', index: true })
  conversation_id: Types.ObjectId;
  @Prop({ enum: ['USER', 'STAFF', 'SYSTEM'] }) sender_type:
    | 'USER'
    | 'STAFF'
    | 'SYSTEM';
  @Prop({ type: Types.ObjectId, required: false }) sender_id?: Types.ObjectId;
  @Prop() text?: string;
  @Prop({ default: false }) is_read: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
