import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './service/product.service';
import { CategoryService } from './service/category.service';
import { CategoryController } from './controller/category.controller';
import { ProductController } from './controller/product.controller';
import { CartController } from './controller/cart.controller';
import { BannerController } from './controller/banner.controller';
import { Category, CategorySchema } from './schema/category.schema';
import { Product, ProductSchema } from './schema/product.schema';
import {
  ProductSuggestion,
  ProductSuggestionSchema,
} from './schema/product-suggestion.schema';
import { Cart, CartSchema } from './schema/cart.schema';
import { CartService } from './service/cart.service';
import { Banner, BannerSchema } from './schema/banner.schema';
import { BannerService } from './service/banner.service';
import { Address, AddressSchema } from './schema/address.schema';
import { AddressService } from './service/address.service';
import { AddressController } from './controller/address.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductSuggestion.name, schema: ProductSuggestionSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Banner.name, schema: BannerSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [
    CategoryController,
    ProductController,
    CartController,
    BannerController,
    AddressController,
  ],
  providers: [
    ProductService,
    CategoryService,
    CartService,
    BannerService,
    AddressService,
  ],
  exports: [
    ProductService,
    CategoryService,
    CartService,
    BannerService,
    AddressService,
  ],
})
export class CatalogModule {}
