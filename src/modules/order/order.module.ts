import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Module } from '@nestjs/common';
import { Product, ProductSchema } from '../catalog/schema/product.schema';
import { Address, AddressSchema } from '../address/schema/address.schema';
import { InventoryModule } from '../inventory/inventory.module';
import { BullModule } from '@nestjs/bullmq';
import { OrderProcessor } from './queue/order.processor';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationModule } from '../notification/notification.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AssignOrderService } from './assign-order.service';
import { Shipper, ShipperSchema } from '../shipper/schema/shipper.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Address.name, schema: AddressSchema },
      { name: User.name, schema: UserSchema },
      { name: Shipper.name, schema: ShipperSchema },
    ]),
    BullModule.registerQueue({
      name: 'order-queue',
    }),
    InventoryModule,
    RealtimeModule,
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor, AssignOrderService],
  exports: [OrderService, AssignOrderService],
})
export class OrderModule {}
