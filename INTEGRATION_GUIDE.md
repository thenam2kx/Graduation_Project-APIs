# Hướng dẫn tích hợp Soft Delete vào Admin Dashboard

## ✅ Hệ thống đã được fix và sẵn sàng

### 🔧 Các lỗi đã được khắc phục:
- ✅ **NoSQL Injection** - Thêm sanitization cho query parameters
- ✅ **Log Injection** - Sanitize logs để tránh log manipulation
- ✅ **CSRF Protection** - Sử dụng JWT tokens thay vì session cookies
- ✅ **Code Duplication** - Tạo helper functions và constants
- ✅ **Performance Issues** - Optimize queries và bulk operations
- ✅ **Input Validation** - Improve validation cho page/limit parameters

## 🚀 Cách tích hợp vào Admin Dashboard

### 1. **API Endpoints** (Đã sẵn sàng)
```
GET    /api/v1/soft-delete/{model}                    - Lấy danh sách đã xóa
PATCH  /api/v1/soft-delete/{model}/{id}/restore       - Khôi phục đơn lẻ
DELETE /api/v1/soft-delete/{model}/{id}/permanent     - Xóa vĩnh viễn đơn lẻ
PATCH  /api/v1/soft-delete/{model}/bulk/restore       - Khôi phục hàng loạt
DELETE /api/v1/soft-delete/{model}/bulk/permanent     - Xóa vĩnh viễn hàng loạt
```

### 2. **Admin Dashboard Pages**
- **Full Dashboard**: `/api/v1/admin/soft-delete` - Dashboard đầy đủ với Bootstrap
- **Integrated View**: `/api/v1/admin/soft-delete-manager` - Tích hợp vào admin hiện tại

### 3. **React Component** (Sẵn sàng sử dụng)
```tsx
import SoftDeleteManager from '~/components/SoftDeleteManager'

// Sử dụng trong admin dashboard
<SoftDeleteManager apiBaseUrl="/api/v1" />
```

### 4. **Supported Models**
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

## 📋 Checklist tích hợp

### Backend (✅ Hoàn thành)
- [x] Soft Delete Service với full CRUD operations
- [x] Secure API endpoints với authentication/authorization
- [x] Input validation và sanitization
- [x] Error handling và logging
- [x] Performance optimization
- [x] Security fixes (NoSQL injection, Log injection)

### Frontend Options

#### Option 1: Sử dụng Dashboard có sẵn
```javascript
// Chỉ cần redirect đến dashboard
window.location.href = '/api/v1/admin/soft-delete'
```

#### Option 2: Tích hợp React Component
```tsx
import SoftDeleteManager from './components/SoftDeleteManager'

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <SoftDeleteManager />
    </div>
  )
}
```

#### Option 3: Sử dụng API trực tiếp
```javascript
// Fetch deleted items
const response = await fetch('/api/v1/soft-delete/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// Restore item
await fetch(`/api/v1/soft-delete/products/${id}/restore`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## 🔐 Authentication

Tất cả endpoints yêu cầu:
- JWT token hợp lệ trong header `Authorization: Bearer <token>`
- User phải có role `admin`

## 📊 Features

### ✅ Đã implement:
- [x] Xem danh sách items đã xóa (có phân trang)
- [x] Khôi phục item đơn lẻ
- [x] Xóa vĩnh viễn item đơn lẻ
- [x] Khôi phục hàng loạt
- [x] Xóa vĩnh viễn hàng loạt
- [x] Validation đầu vào
- [x] Error handling
- [x] Audit logging
- [x] Security protection

### 🎨 UI Features:
- [x] Responsive design
- [x] Search và filter
- [x] Bulk selection
- [x] Confirmation modals
- [x] Loading states
- [x] Error messages
- [x] Success notifications

## 🚀 Deployment

1. **Environment Variables**
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

2. **Start Server**
```bash
npm run dev
```

3. **Access Dashboard**
- Full Dashboard: `http://localhost:3000/api/v1/admin/soft-delete`
- Integrated View: `http://localhost:3000/api/v1/admin/soft-delete-manager`

## 🔍 Testing

### API Testing với curl:
```bash
# Get deleted products
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/soft-delete/products

# Restore product
curl -X PATCH \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/soft-delete/products/PRODUCT_ID/restore

# Bulk restore
curl -X PATCH \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"ids":["ID1","ID2"]}' \
     http://localhost:3000/api/v1/soft-delete/products/bulk/restore
```

## 📞 Support

Hệ thống đã được test và sẵn sàng sử dụng. Nếu cần hỗ trợ:
1. Kiểm tra logs trong `logs/combined.log`
2. Verify JWT token và permissions
3. Check MongoDB connection
4. Ensure models có mongoose-delete plugin

## 🎯 Next Steps

Hệ thống soft delete đã hoàn chỉnh và sẵn sàng tích hợp vào admin dashboard hiện tại. Chọn một trong các options tích hợp ở trên và bắt đầu sử dụng!