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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
    BullModule.registerQueue({
      name: 'order-queue',
    }),
    InventoryModule,
    RealtimeModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor],
  exports: [OrderService],
})
export class OrderModule {}
