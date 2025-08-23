# 🎫 Hệ Thống Mã Giảm Giá (Discounts System)

## 📋 Tổng Quan
Hệ thống quản lý mã giảm giá cho ứng dụng e-commerce, hỗ trợ tạo, quản lý và áp dụng các mã giảm giá với nhiều loại khác nhau.

## 🏗️ Kiến Trúc Hệ Thống

### Luồng Xử Lý
```
Client Request → Routes → Validation → Controller → Service → Model → Database
```

### Cấu Trúc File
```
src/
├── routes/v1/discounts.routes.ts     # Định tuyến API
├── validations/discounts.validation.ts # Xác thực dữ liệu
├── controllers/discounts.controller.ts # Xử lý request/response
├── services/discounts.service.ts      # Logic nghiệp vụ
└── models/discounts.model.ts          # Schema database
```

## 🔗 API Endpoints

### Base URL: `/api/v1/discounts`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/` | Tạo mã giảm giá mới |
| GET | `/` | Lấy danh sách mã giảm giá |
| GET | `/:discountsID` | Lấy chi tiết mã giảm giá |
| PATCH | `/:discountsID` | Cập nhật mã giảm giá |
| DELETE | `/:discountsID` | Xóa mã giảm giá |

## 📊 Schema Dữ Liệu

```typescript
interface IDiscounts {
  code: string                    // Mã giảm giá (unique)
  description: string             // Mô tả
  type: '%' | 'Vnd'              // Loại giảm giá
  value: number                   // Giá trị giảm
  min_order_value: number         // Giá trị đơn hàng tối thiểu
  max_discount_amount: number     // Số tiền giảm tối đa
  status: string                  // Trạng thái
  applies_category?: string[]     // Áp dụng cho danh mục
  applies_product?: string[]      // Áp dụng cho sản phẩm
  applies_variant?: string[]      // Áp dụng cho biến thể
  startDate: Date                 // Ngày bắt đầu
  endDate: Date                   // Ngày kết thúc
  usage_limit: number             // Giới hạn sử dụng
  usage_per_user: number          // Số lần sử dụng/người
}
```

## 🔧 Validation Rules

### Tạo/Cập Nhật Mã Giảm Giá
- `code`: Bắt buộc, không trống, duy nhất
- `type`: Chỉ chấp nhận "%" hoặc "Vnd"
- `value`: Số > 0, nếu type="%" thì ≤ 100
- `usage_limit`: 0-100
- `usage_per_user`: 0-1
- `endDate`: Phải sau startDate
- `max_discount_amount`: Bắt buộc khi type="%"

### Phân Trang
- `current`: Trang hiện tại (mặc định: 1)
- `pageSize`: Số item/trang (mặc định: 10, tối đa: 100)
- `qs`: Từ khóa tìm kiếm

## 💼 Business Logic

### Tạo Mã Giảm Giá
1. Validate dữ liệu đầu vào
2. Kiểm tra mã đã tồn tại
3. Validate logic ngày tháng
4. Validate giá trị theo loại giảm giá
5. Lưu vào database

### Lấy Danh Sách
1. Parse query parameters
2. Xây dựng filter và sort
3. Thực hiện phân trang
4. Populate thông tin liên quan
5. Trả về kết quả với metadata

### Cập Nhật/Xóa
1. Validate ObjectId
2. Kiểm tra tồn tại
3. Thực hiện thao tác
4. Trả về kết quả

## 🛡️ Error Handling

### Status Codes
- `200`: Thành công
- `201`: Tạo thành công
- `400`: Dữ liệu không hợp lệ
- `404`: Không tìm thấy
- `409`: Xung đột (mã đã tồn tại)
- `422`: Validation error
- `500`: Lỗi server

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Thông báo lỗi",
  "error": {
    "code": 400,
    "details": "Chi tiết lỗi"
  }
}
```

## 📝 Request/Response Examples

### Tạo Mã Giảm Giá
```bash
POST /api/v1/discounts
Content-Type: application/json

{
  "code": "SUMMER2024",
  "description": "Giảm giá mùa hè",
  "type": "%",
  "value": 20,
  "min_order_value": 500000,
  "max_discount_amount": 100000,
  "startDate": "2024-06-01T00:00:00.000Z",
  "endDate": "2024-08-31T23:59:59.000Z",
  "usage_limit": 100,
  "usage_per_user": 1
}
```

### Response Thành Công
```json
{
  "statusCode": 201,
  "message": "Tạo mã giảm giá thành công",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "code": "SUMMER2024",
    "description": "Giảm giá mùa hè",
    "type": "%",
    "value": 20,
    "status": "Sắp diễn ra",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Lấy Danh Sách
```bash
GET /api/v1/discounts?current=1&pageSize=10&qs=SUMMER
```

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách mã giảm giá thành công",
  "data": {
    "meta": {
      "current": 1,
      "pageSize": 10,
      "pages": 1,
      "total": 1
    },
    "results": [...]
  }
}
```

## 🔍 Features

### Soft Delete
- Sử dụng `mongoose-delete` plugin
- Mã giảm giá bị xóa vẫn lưu trong database
- Có thể khôi phục nếu cần

### Population
- Tự động populate thông tin category, product, variant
- Hiển thị tên thay vì chỉ ID

### Search & Filter
- Tìm kiếm theo mã và mô tả
- Hỗ trợ query string phức tạp
- Sắp xếp theo nhiều tiêu chí

## 🚀 Deployment Notes

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/your-db
NODE_ENV=development
```

### Dependencies
- `mongoose`: ODM cho MongoDB
- `mongoose-delete`: Soft delete plugin
- `joi`: Validation
- `api-query-params`: Query parsing

## 🧪 Testing

### Test Cases
- Tạo mã giảm giá hợp lệ/không hợp lệ
- Validation các trường bắt buộc
- Logic nghiệp vụ (ngày tháng, giá trị)
- CRUD operations
- Error handling

### Run Tests
```bash
npm test
```

## 📚 Related Documentation
- [API Documentation](./API_DOCS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT.md)