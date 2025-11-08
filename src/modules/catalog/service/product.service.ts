import { Model, Types } from 'mongoose';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from '../schema/product.schema';
import { Brand, BrandDocument } from '../schema/brand.schema';
import { Category, CategoryDocument } from '../schema/category.schema';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CloudinaryService } from '../../../shared/cloudinary/cloudinary.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(Brand.name)
    private brandModel: Model<BrandDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getProductsAdmin(page: number = 0, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const products: Product[] = await this.productModel
      .find({ is_active: true, is_deleted: false })
      .skip(skip)
      .limit(limit)
      .select(
        '_id name unit unit_price image_primary discount_percent final_price stock_status is_active quantity',
      )
      .lean();

    return {
      total: products.length,
      page,
      limit,
      products,
    };
  }

  async searchProducts(
    key: string | undefined,
    skip: number,
    category?: string,
    brand?: string,
    sortOrder?: string,
  ): Promise<any> {
    const actualLimit: number = skip === 0 ? 40 : 10;

    const filters: Record<string, any> = { is_deleted: false, is_active: true };

    if (key) {
      filters.$text = { $search: key };
    }
    if (category) {
      const categorySlugs = category.split(' ').filter((slug) => slug.trim());
      const categoryExists = await this.categoryModel.find({
        slug: { $in: categorySlugs },
      });
      if (!categoryExists || categoryExists.length === 0) {
        throw new NotFoundException('Category not found');
      }
      if (categoryExists.length !== categorySlugs.length) {
        throw new NotFoundException('Some categories not found');
      }
      filters.category_id = {
        $in: categoryExists.map((cat) => cat._id),
      };
    }
    if (brand) {
      const brands = brand.split(' ');
      const brandExists = await this.brandModel.find({
        slug: { $in: brands },
      });
      if (!brandExists || brandExists.length === 0) {
        throw new NotFoundException('Brand not found');
      }
      if (brandExists.length !== brands.length) {
        throw new NotFoundException('Some brands not found');
      }
      filters.brand_id = { $in: brandExists.map((brand) => brand._id) };
    }

    let sortCriteria: Record<string, any> = {};
    let useTextScore = false;

    if (sortOrder) {
      switch (sortOrder?.toLowerCase()) {
        case 'price-asc':
          sortCriteria = { final_price: 1 };
          break;
        case 'price-desc':
          sortCriteria = { final_price: -1 };
          break;
        case 'hot':
          sortCriteria = { discount_percent: -1 };
          break;
        case 'new':
          sortCriteria = { created_at: -1 };
          break;
        default:
          sortCriteria = { created_at: -1 };
      }
    } else if (key) {
      useTextScore = true;
    } else {
      sortCriteria = { created_at: -1 };
    }

    const query = this.productModel.find(filters).skip(skip).limit(actualLimit);

    if (useTextScore) {
      query
        .select({
          _id: 1,
          name: 1,
          unit: 1,
          unit_price: 1,
          image_primary: 1,
          discount_percent: 1,
          final_price: 1,
          stock_status: 1,
          is_active: 1,
          category_id: 1,
          score: { $meta: 'textScore' },
        })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      query
        .select(
          '_id name unit unit_price image_primary discount_percent final_price stock_status is_active category_id quantity',
        )
        .sort(sortCriteria);
    }

    const products = await query.lean();

    return {
      total: products.length,
      skip,
      actualLimit,
      products,
    };
  }
  async getProductsByCategorySlugOrAll(
    categorySlug?: string,
  ): Promise<Product[]> {
    if (!categorySlug) {
      return await this.productModel
        .find({ is_active: true, is_deleted: false })
        .lean();
    }

    const category = await this.categoryModel
      .findOne({ slug: categorySlug })
      .lean();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subCategories = await this.categoryModel
      .find({ parent_id: category._id })
      .select('_id')
      .lean();

    const categoryIds = [category._id, ...subCategories.map((sub) => sub._id)];

    return await this.productModel
      .find({
        category_id: { $in: categoryIds },
        is_active: true,
        is_deleted: false,
      })
      .select(
        'name slug unit_price image_primary discount_percent final_price stock_status',
      )
      .lean();
  }

  async getProductDetail(productId: string): Promise<Product> {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(productId)) {
      throw new BadRequestException('Invalid product id');
    }
    const product = await this.productModel
      .findOne({ _id: productId, is_active: true, is_deleted: false })
      .select(
        'name slug image_primary unit_price discount_percent final_price stock_status images quantity',
      )
      .lean();

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async getProductPromotionByCategorySlugOrAll(
    categorySlug?: string,
  ): Promise<Product[]> {
    if (!categorySlug) {
      return this.productModel
        .find({
          is_active: true,
          is_deleted: false,
          discount_percent: { $gt: 0 },
        })
        .select(
          'name slug unit_price discount_percent final_price stock_status image_primary quantity',
        )
        .lean();
    }

    const category = await this.categoryModel
      .findOne({ slug: categorySlug })
      .lean();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subCategories = await this.categoryModel
      .find({ parent_id: category._id })
      .select('_id')
      .lean();

    const categoryIds = [category._id, ...subCategories.map((sub) => sub._id)];

    const productsPromotion = await this.productModel
      .find({
        category_id: { $in: categoryIds },
        is_active: true,
        is_deleted: false,
        discount_percent: { $gt: 0 },
      })
      .select(
        'name slug unit_price image_primary discount_percent final_price stock_status quantity',
      )
      .lean();

    return productsPromotion;
  }

  async create(
    dto: CreateProductDto,
    files?: {
      image_primary?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ): Promise<Product> {
    if (!Types.ObjectId.isValid(dto.category_id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const categoryExists = await this.categoryModel.findById(dto.category_id);
    if (!categoryExists) {
      throw new NotFoundException('Category not found');
    }

    if (dto.brand_id && !Types.ObjectId.isValid(dto.brand_id)) {
      throw new BadRequestException('Invalid brand ID');
    }
    const finalPrice =
      dto.discount_percent && dto.discount_percent > 0
        ? dto.unit_price * (1 - dto.discount_percent / 100)
        : dto.unit_price;

    let imagePrimaryUrl = dto.image_primary;
    if (files?.image_primary && files.image_primary[0]) {
      try {
        imagePrimaryUrl = await this.cloudinaryService.uploadImage(
          files.image_primary[0],
          'WebSieuThi/products',
        );
      } catch {
        throw new BadRequestException('Error uploading image primary');
      }
    }

    let imagesUrls = dto.images;
    if (files?.images && files.images.length > 0) {
      try {
        imagesUrls = await this.cloudinaryService.uploadMultipleImages(
          files.images,
          'WebSieuThi/products',
        );
      } catch {
        throw new BadRequestException('Error uploading images');
      }
    }

    const product = new this.productModel({
      ...dto,
      category_id: new Types.ObjectId(dto.category_id),
      brand_id: dto.brand_id ? new Types.ObjectId(dto.brand_id) : undefined,
      final_price: finalPrice,
      discount_percent: dto.discount_percent || 0,
      stock_status: dto.stock_status || 'in_stock',
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      image_primary: imagePrimaryUrl,
      images: imagesUrls,
    });

    try {
      const savedProduct = await product.save();
      return {
        category_id: savedProduct.category_id,
        brand_id: savedProduct.brand_id,
        name: savedProduct.name,
        slug: savedProduct.slug,
        unit_price: savedProduct.unit_price,
        discount_percent: savedProduct.discount_percent,
        final_price: savedProduct.final_price,
        stock_status: savedProduct.stock_status,
        is_active: savedProduct.is_active,
        is_deleted: savedProduct.is_deleted,
        image_primary: savedProduct.image_primary,
        images: savedProduct.images,
        quantity: savedProduct.quantity,
      } as Product;
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Product with slug "${dto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    files?: {
      image_primary?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    if (dto.category_id) {
      if (!Types.ObjectId.isValid(dto.category_id)) {
        throw new BadRequestException('Invalid category ID');
      }
      const categoryExists = await this.categoryModel.findById(dto.category_id);
      if (!categoryExists) {
        throw new NotFoundException('Category not found');
      }
    }

    if (dto.brand_id && !Types.ObjectId.isValid(dto.brand_id)) {
      throw new BadRequestException('Invalid brand ID');
    }

    const currentProduct = await this.productModel.findOne({
      _id: id,
      is_deleted: false,
    });
    if (!currentProduct) {
      throw new NotFoundException('Product not found');
    }

    let imagePrimaryUrl = dto.image_primary ?? currentProduct.image_primary;
    if (files?.image_primary && files.image_primary[0]) {
      try {
        imagePrimaryUrl = await this.cloudinaryService.uploadImage(
          files.image_primary[0],
          'WebSieuThi/products',
        );
      } catch {
        throw new BadRequestException('Error uploading image primary');
      }
    }

    let imagesUrls = dto.images ?? currentProduct.images;
    if (files?.images && files.images.length > 0) {
      try {
        imagesUrls = await this.cloudinaryService.uploadMultipleImages(
          files.images,
          'WebSieuThi/products',
        );
      } catch {
        throw new BadRequestException('Error uploading images');
      }
    }

    const unitPrice = dto.unit_price ?? currentProduct.unit_price;
    const discountPercent =
      dto.discount_percent ?? currentProduct.discount_percent;
    const finalPrice =
      discountPercent > 0 ? unitPrice * (1 - discountPercent / 100) : unitPrice;

    const updateData: Record<string, any> = {
      ...dto,
      final_price: finalPrice,
      image_primary: imagePrimaryUrl,
      images: imagesUrls,
    };

    if (dto.category_id) {
      updateData.category_id = new Types.ObjectId(dto.category_id);
    }
    if (dto.brand_id) {
      updateData.brand_id = new Types.ObjectId(dto.brand_id);
    }

    // Loại bỏ các field undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      const updated = await this.productModel
        .findByIdAndUpdate(id, { $set: updateData }, { new: true })
        .select(
          'name slug unit_price discount_percent final_price stock_status image_primary images',
        )
        .lean();

      if (!updated) {
        throw new NotFoundException('Product not found');
      }

      return updated as Product;
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Product with slug "${dto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const result = await this.productModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Product not found');
    }

    return { message: 'Product deleted successfully' };
  }
}
