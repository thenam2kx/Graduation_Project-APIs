# Hướng dẫn sử dụng Soft Delete System

## Tổng quan
Hệ thống Soft Delete cho phép xóa mềm và quản lý các items đã bị xóa một cách an toàn, với khả năng khôi phục hoặc xóa vĩnh viễn.

## API Endpoints

### 1. Lấy danh sách items đã xóa
```
GET /api/v1/soft-delete/{model}?page=1&limit=10
```

**Supported Models:**
- `products` - Sản phẩm
- `users` - Người dùng  
- `categories` - Danh mục
- `brands` - Thương hiệu
- `blogs` - Blog
- `blogcategories` - Danh mục blog
- `discounts` - Giảm giá
- `attributes` - Thuộc tính
- `contacts` - Liên hệ
- `notifications` - Thông báo
- `reviews` - Đánh giá
- `wishlists` - Danh sách yêu thích

### 2. Khôi phục item đơn lẻ
```
PATCH /api/v1/soft-delete/{model}/{id}/restore
```

### 3. Xóa vĩnh viễn item đơn lẻ
```
DELETE /api/v1/soft-delete/{model}/{id}/permanent
```

### 4. Khôi phục hàng loạt
```
PATCH /api/v1/soft-delete/{model}/bulk/restore
Content-Type: application/json

{
  "ids": ["id1", "id2", "id3"]
}
```

### 5. Xóa vĩnh viễn hàng loạt
```
DELETE /api/v1/soft-delete/{model}/bulk/permanent
Content-Type: application/json

{
  "ids": ["id1", "id2", "id3"]
}
```

## Admin Dashboard

Truy cập dashboard quản lý tại: `/api/v1/admin/soft-delete`

### Tính năng Dashboard:
- ✅ Xem danh sách items đã xóa theo từng model
- ✅ Khôi phục item đơn lẻ hoặc hàng loạt
- ✅ Xóa vĩnh viễn item đơn lẻ hoặc hàng loạt
- ✅ Phân trang và tìm kiếm
- ✅ Giao diện thân thiện với người dùng
- ✅ Xác nhận trước khi thực hiện hành động nguy hiểm

## Bảo mật

### Authentication & Authorization
- Tất cả endpoints yêu cầu JWT token hợp lệ
- Chỉ admin mới có quyền truy cập
- Validation đầu vào nghiêm ngặt

### Security Features
- ✅ NoSQL Injection protection
- ✅ Input sanitization
- ✅ Rate limiting
- ✅ Proper error handling
- ✅ Audit logging

## Cách sử dụng trong code

### 1. Soft delete một item
```javascript
// Trong service layer
await ProductModel.delete({ _id: productId })
```

### 2. Lấy items đã xóa
```javascript
const deletedProducts = await ProductModel.findDeleted()
```

### 3. Khôi phục item
```javascript
const product = await ProductModel.findDeleted({ _id: productId }).findOne()
await product.restore()
```

### 4. Xóa vĩnh viễn
```javascript
await ProductModel.findByIdAndDelete(productId)
```

## Environment Variables

Thêm vào file `.env`:
```
MONGODB_URI=your_mongodb_connection_string
```

## Logging

Hệ thống ghi log tất cả các hoạt động soft delete:
- Restore operations
- Permanent delete operations
- Bulk operations
- Error tracking

## Best Practices

1. **Luôn kiểm tra dependencies** trước khi xóa vĩnh viễn
2. **Backup dữ liệu** trước khi thực hiện bulk operations
3. **Sử dụng transactions** cho các operations phức tạp
4. **Monitor logs** để theo dõi hoạt động
5. **Test thoroughly** trước khi deploy

## Troubleshooting

### Lỗi thường gặp:

1. **401 Unauthorized**: Kiểm tra JWT token
2. **403 Forbidden**: Kiểm tra quyền admin
3. **404 Not Found**: Kiểm tra model name và ID
4. **422 Validation Error**: Kiểm tra format dữ liệu đầu vào

### Debug:
- Kiểm tra logs trong `logs/combined.log`
- Sử dụng browser dev tools cho dashboard
- Test API endpoints với Postman/curl

## Performance

- Sử dụng indexes cho `deleted` và `deletedAt` fields
- Implement pagination cho large datasets
- Bulk operations được optimize với `bulkWrite()`
- Caching cho frequently accessed data