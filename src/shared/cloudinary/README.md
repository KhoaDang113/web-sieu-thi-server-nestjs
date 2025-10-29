# Cloudinary Upload Module

Module này cung cấp chức năng upload ảnh lên Cloudinary cho ứng dụng NestJS.

## Cài đặt

1. Cài đặt dependencies (đã thực hiện):

```bash
npm install cloudinary multer @types/multer
```

2. Cấu hình biến môi trường trong file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Sử dụng

### 1. Upload một ảnh

**Endpoint:** `POST /upload/image`

**Headers:**

```
Content-Type: multipart/form-data
```

**Body (form-data):**

- `file`: File ảnh (JPEG, PNG, WebP)
- Query parameter `folder` (optional): Tên thư mục trên Cloudinary

**Ví dụ với cURL:**

```bash
curl -X POST http://localhost:3000/upload/image?folder=products \
  -F "file=@/path/to/image.jpg"
```

**Response:**

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456/products/abc123.jpg",
  "message": "Image uploaded successfully"
}
```

### 2. Upload nhiều ảnh

**Endpoint:** `POST /upload/images`

**Body (form-data):**

- `files`: Nhiều file ảnh (tối đa 10 ảnh)
- Query parameter `folder` (optional): Tên thư mục

**Ví dụ với cURL:**

```bash
curl -X POST http://localhost:3000/upload/images?folder=gallery \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

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

### 3. Sử dụng trong Service khác

Bạn có thể import `CloudinaryService` vào module khác:

```typescript
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductService {
  constructor(private cloudinaryService: CloudinaryService) {}

  async createProduct(dto: CreateProductDto, imageFile: Express.Multer.File) {
    // Upload ảnh lên Cloudinary
    const imageUrl = await this.cloudinaryService.uploadImage(
      imageFile,
      'products',
    );

    // Lưu product với imageUrl
    const product = new this.productModel({
      ...dto,
      image_primary: imageUrl,
    });

    return product.save();
  }
}
```

## Giới hạn

- **Loại file được phép:** JPEG, PNG, WebP
- **Kích thước tối đa:** 5MB/file
- **Số lượng tối đa (upload nhiều):** 10 ảnh/lần

## Các tính năng

- ✅ Upload một ảnh
- ✅ Upload nhiều ảnh cùng lúc
- ✅ Tự động tối ưu hóa chất lượng và format
- ✅ Kiểm tra loại file và kích thước
- ✅ Phân loại theo thư mục
- ✅ Xóa ảnh từ Cloudinary
- ✅ Lấy public ID từ URL

## Lưu ý

- Đảm bảo đã cấu hình đúng thông tin Cloudinary trong file `.env`
- URL trả về là `secure_url` (HTTPS)
- Ảnh được tự động tối ưu hóa với `quality: auto` và `fetch_format: auto`
