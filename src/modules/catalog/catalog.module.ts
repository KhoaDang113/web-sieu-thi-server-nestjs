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
// import { Address, AddressSchema } from '../address/schema/address.schema';
// import { AddressService } from './service/address.service';
// import { AddressController } from './controller/address.controller';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import { Brand, BrandSchema } from './schema/brand.schema';
import { Rating, RatingSchema } from './schema/rating.schema';
import { RatingService } from './service/rating.service';
import { RatingController } from './controller/rating.controller';
// import { Comment, CommentSchema } from './schema/comment.schema';
// import { CommentService } from './service/comment.service';
// import { CommentController } from '../comment/comment.controller';
import { Combo, ComboSchema } from './schema/combo.schema';
import { ComboService } from './service/combo.service';
import { ComboController } from './controller/combo.controller';
// import { Order, OrderSchema } from '../order/schema/order.schema';
// import { OrderService } from '../order/order.service';
// import { OrderController } from '../order/order.controller';
// Inventory moved to its own module

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductSuggestion.name, schema: ProductSuggestionSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Banner.name, schema: BannerSchema },
      // { name: Address.name, schema: AddressSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Rating.name, schema: RatingSchema },
      // { name: Comment.name, schema: CommentSchema },
      { name: Combo.name, schema: ComboSchema },
      // { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [
    CategoryController,
    ProductController,
    CartController,
    BannerController,
    // AddressController,
    RatingController,
    // CommentController,
    ComboController,
    // OrderController,
  ],
  providers: [
    ProductService,
    CategoryService,
    CloudinaryService,
    CartService,
    BannerService,
    // AddressService,
    RatingService,
    // CommentService,
    ComboService,
    // OrderService,
  ],
  exports: [
    ProductService,
    CategoryService,
    CartService,
    BannerService,
    // AddressService,
    RatingService,
    // CommentService,
    ComboService,
    // OrderService,
  ],
})
export class CatalogModule {}
