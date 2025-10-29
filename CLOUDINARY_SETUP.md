# Hướng dẫn cài đặt và sử dụng Cloudinary Upload

## 📋 Tổng quan

Module Cloudinary đã được tích hợp vào dự án để hỗ trợ upload ảnh lên cloud. Module này cung cấp:

- ✅ Upload một hoặc nhiều ảnh
- ✅ Tự động tối ưu hóa ảnh
- ✅ Kiểm tra định dạng và kích thước file
- ✅ Quản lý thư mục trên Cloudinary
- ✅ Xóa ảnh

## 🚀 Các bước cài đặt

### 1. Đăng ký tài khoản Cloudinary

Truy cập [https://cloudinary.com](https://cloudinary.com) và đăng ký tài khoản miễn phí.

### 2. Lấy thông tin API

Sau khi đăng ký, vào Dashboard và lấy:

- **Cloud Name**
- **API Key**
- **API Secret**

### 3. Cấu hình biến môi trường

Tạo file `.env` (nếu chưa có) và thêm:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**⚠️ Lưu ý:** Thay thế các giá trị `your_*` bằng thông tin thực tế từ Cloudinary Dashboard.

## 📡 API Endpoints

### 1. Upload một ảnh

**Endpoint:**

```
POST /upload/image
```

**Parameters:**

- `file` (form-data, required): File ảnh
- `folder` (query, optional): Tên thư mục trên Cloudinary (mặc định: "uploads")

**Ví dụ với Postman:**

1. Method: POST
2. URL: `http://localhost:3000/upload/image?folder=products`
3. Body > form-data:
   - Key: `file`
   - Type: File
   - Value: Chọn file ảnh

**Response:**

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234/products/abc.jpg",
  "message": "Image uploaded successfully"
}
```

### 2. Upload nhiều ảnh

**Endpoint:**

```
POST /upload/images
```

**Parameters:**

- `files` (form-data, required): Nhiều file ảnh (tối đa 10)
- `folder` (query, optional): Tên thư mục

**Ví dụ với Postman:**

1. Method: POST
2. URL: `http://localhost:3000/upload/images?folder=gallery`
3. Body > form-data:
   - Key: `files` (lưu ý: thêm nhiều row cùng key `files`)
   - Type: File
   - Value: Chọn file ảnh cho mỗi row

**Response:**

```json
{
  "success": true,
  "urls": [
    "https://res.cloudinary.com/.../image1.jpg",
    "https://res.cloudinary.com/.../image2.jpg"
  ],
  "count": 2,
  "message": "2 image(s) uploaded successfully"
}
```

## 📁 Cấu trúc thư mục được tạo

```
src/modules/cloudinary/
├── cloudinary.module.ts       # Module chính
├── cloudinary.provider.ts     # Provider cấu hình Cloudinary
├── cloudinary.service.ts      # Service xử lý upload
├── upload.controller.ts       # Controller API endpoints
└── README.md                  # Tài liệu chi tiết
```

## 💻 Sử dụng trong code

### Ví dụ 1: Sử dụng trong ProductController

```typescript
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('products')
export class ProductController {
  constructor(
    private productService: ProductService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    // Upload ảnh lên Cloudinary
    const imageUrl = await this.cloudinaryService.uploadImage(
      image,
      'products',
    );

    // Lưu product với URL ảnh
    return this.productService.create({
      ...dto,
      image_primary: imageUrl,
    });
  }
}
```

### Ví dụ 2: Upload nhiều ảnh cho product

```typescript
@Post(':id/images')
@UseInterceptors(FilesInterceptor('images', 5))
async uploadProductImages(
  @Param('id') id: string,
  @UploadedFiles() images: Express.Multer.File[],
) {
  const imageUrls = await this.cloudinaryService.uploadMultipleImages(
    images,
    'products'
  );

  return this.productService.addImages(id, imageUrls);
}
```

## 🔒 Giới hạn và quy tắc

- **Định dạng cho phép:** JPEG, PNG, WebP
- **Kích thước tối đa:** 5MB/file
- **Số lượng tối đa:** 10 ảnh/request (cho endpoint upload nhiều)
- **Thư mục mặc định:** `uploads`

## 🎨 Các thư mục được đề xuất

- `products` - Ảnh sản phẩm
- `banners` - Ảnh banner quảng cáo
- `categories` - Ảnh danh mục
- `users` - Ảnh đại diện người dùng
- `gallery` - Ảnh gallery chung

## 🐛 Xử lý lỗi

Module tự động validate và trả về lỗi rõ ràng:

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG, PNG, and WebP are allowed",
  "error": "Bad Request"
}
```

Các lỗi phổ biến:

- `No file provided` - Không có file trong request
- `Invalid file type` - File không đúng định dạng
- `File size too large` - File quá 5MB
- `Upload failed` - Lỗi khi upload lên Cloudinary

## 📝 Testing

### Test với cURL:

```bash
# Upload một ảnh
curl -X POST http://localhost:3000/upload/image?folder=test \
  -F "file=@/path/to/image.jpg"

# Upload nhiều ảnh
curl -X POST http://localhost:3000/upload/images?folder=test \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

## 🔗 Tài liệu tham khảo

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Multer Documentation](https://github.com/expressjs/multer)

## ✅ Checklist

- [x] Cài đặt dependencies (cloudinary, multer)
- [x] Tạo CloudinaryModule
- [x] Tạo CloudinaryService
- [x] Tạo UploadController
- [x] Import vào AppModule
- [ ] Cấu hình biến môi trường (.env)
- [ ] Test upload ảnh
- [ ] Tích hợp vào ProductService
- [ ] Tích hợp vào BannerService

## 🆘 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:

1. ✅ Biến môi trường CLOUDINARY\_\* đã được cấu hình chưa?
2. ✅ Server đã khởi động lại sau khi thêm .env chưa?
3. ✅ Thông tin Cloudinary có chính xác không?
4. ✅ Định dạng file có đúng không?
5. ✅ Kích thước file có vượt quá 5MB không?
