import OrderModel from '../models/order.model'
import { shippingController } from '../controllers/shipping.controller'
import { connectDB } from '../config/database'

/**
 * Script để đồng bộ trạng thái vận chuyển từ các đơn vị vận chuyển
 * Chạy định kỳ để cập nhật trạng thái các đơn hàng đang vận chuyển
 */

interface ShippingStatusResponse {
  statusCode: string
  statusName: string
  description?: string
  updatedAt: string
}

// Mock function - thay thế bằng API thực của đơn vị vận chuyển (GHN, GHTK, etc.)
const getShippingStatusFromProvider = async (orderCode: string): Promise<ShippingStatusResponse | null> => {
  try {
    // TODO: Thay thế bằng API call thực tế
    // Ví dụ với GHN:
    // const response = await ghnAPI.getOrderStatus(orderCode)
    // return response.data
    
    // Mock response for testing
    const mockStatuses = ['picked', 'delivering', 'delivered']
    const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
    
    return {
      statusCode: randomStatus,
      statusName: getStatusName(randomStatus),
      description: `Cập nhật tự động - ${randomStatus}`,
      updatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error(`Error getting shipping status for order ${orderCode}:`, error)
    return null
  }
}

const getStatusName = (statusCode: string): string => {
  const statusNames: Record<string, string> = {
    'ready_to_pick': 'Chờ lấy hàng',
    'picking': 'Đang lấy hàng',
    'picked': 'Đã lấy hàng',
    'delivering': 'Đang giao hàng',
    'delivered': 'Đã giao hàng',
    'delivery_fail': 'Giao hàng thất bại',
    'waiting_to_return': 'Chờ trả hàng',
    'return': 'Đang trả hàng',
    'returned': 'Đã trả hàng',
    'cancel': 'Đã hủy',
    'exception': 'Ngoại lệ'
  }
  return statusNames[statusCode] || 'Không xác định'
}

const syncShippingStatus = async (orderId: string): Promise<boolean> => {
  try {
    const order = await OrderModel.findById(orderId)
    if (!order || !order.shipping?.orderCode) {
      console.log(`Order ${orderId} không có mã vận chuyển`)
      return false
    }

    // Lấy trạng thái mới nhất từ đơn vị vận chuyển
    const shippingStatus = await getShippingStatusFromProvider(order.shipping.orderCode)
    if (!shippingStatus) {
      console.log(`Không thể lấy trạng thái vận chuyển cho đơn ${orderId}`)
      return false
    }

    // Kiểm tra xem trạng thái có thay đổi không
    if (order.shipping.statusCode === shippingStatus.statusCode) {
      console.log(`Trạng thái đơn ${orderId} không thay đổi: ${shippingStatus.statusCode}`)
      return false
    }

    // Cập nhật trạng thái
    const statusNames: Record<string, string> = {
      'ready_to_pick': 'Chờ lấy hàng',
      'picking': 'Đang lấy hàng',
      'picked': 'Đã lấy hàng',
      'delivering': 'Đang giao hàng',
      'delivered': 'Đã giao hàng',
      'delivery_fail': 'Giao hàng thất bại',
      'waiting_to_return': 'Chờ trả hàng',
      'return': 'Đang trả hàng',
      'returned': 'Đã trả hàng',
      'cancel': 'Đã hủy',
      'exception': 'Ngoại lệ'
    }

    // Map trạng thái vận chuyển sang trạng thái đơn hàng
    const shippingToOrderStatusMap: Record<string, string> = {
      'ready_to_pick': 'processing',
      'picking': 'processing',
      'picked': 'shipped',
      'delivering': 'shipped',
      'delivered': 'delivered',
      'delivery_fail': 'cancelled',
      'waiting_to_return': 'cancelled',
      'return': 'cancelled',
      'returned': 'cancelled',
      'cancel': 'cancelled',
      'exception': 'cancelled'
    }

    const orderStatus = shippingToOrderStatusMap[shippingStatus.statusCode] || 'processing'
    
    // Xác định trạng thái thanh toán
    let paymentStatus = order.paymentStatus
    if (shippingStatus.statusCode === 'delivered' && order.paymentMethod === 'cash') {
      paymentStatus = 'paid'
    }

    // Cập nhật database
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        'shipping.statusCode': shippingStatus.statusCode,
        'shipping.statusName': statusNames[shippingStatus.statusCode] || 'Không xác định',
        'shipping.description': shippingStatus.description,
        'shipping.updatedAt': new Date(shippingStatus.updatedAt),
        status: orderStatus,
        paymentStatus: paymentStatus
      },
      { new: true }
    )

    console.log(`✅ Đã cập nhật trạng thái đơn ${orderId}: ${shippingStatus.statusCode} -> ${orderStatus}`)
    return true
  } catch (error) {
    console.error(`❌ Lỗi khi đồng bộ trạng thái đơn ${orderId}:`, error)
    return false
  }
}

const syncAllActiveOrders = async (): Promise<void> => {
  try {
    console.log('🔄 Bắt đầu đồng bộ trạng thái vận chuyển...')
    
    // Lấy tất cả đơn hàng đang vận chuyển
    const activeOrders = await OrderModel.find({
      status: { $in: ['processing', 'shipped'] },
      'shipping.orderCode': { $exists: true, $ne: null }
    }).select('_id shipping status paymentMethod paymentStatus')

    console.log(`📦 Tìm thấy ${activeOrders.length} đơn hàng cần đồng bộ`)

    let successCount = 0
    let errorCount = 0

    // Đồng bộ từng đơn hàng
    for (const order of activeOrders) {
      const success = await syncShippingStatus(order._id.toString())
      if (success) {
        successCount++
      } else {
        errorCount++
      }
      
      // Delay nhỏ để tránh spam API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`✅ Hoàn thành đồng bộ: ${successCount} thành công, ${errorCount} lỗi`)
  } catch (error) {
    console.error('❌ Lỗi khi đồng bộ trạng thái vận chuyển:', error)
  }
}

// Chạy script
const runSyncScript = async () => {
  try {
    await connectDB()
    console.log('🔗 Đã kết nối database')
    
    await syncAllActiveOrders()
    
    console.log('🎉 Script hoàn thành')
    process.exit(0)
  } catch (error) {
    console.error('💥 Script thất bại:', error)
    process.exit(1)
  }
}

// Chạy định kỳ mỗi 5 phút
const startPeriodicSync = () => {
  console.log('🚀 Bắt đầu đồng bộ định kỳ mỗi 5 phút...')
  
  // Chạy ngay lần đầu
  syncAllActiveOrders()
  
  // Chạy mỗi 5 phút
  setInterval(() => {
    syncAllActiveOrders()
  }, 5 * 60 * 1000) // 5 phút
}

// Export functions để sử dụng ở nơi khác
export {
  syncShippingStatus,
  syncAllActiveOrders,
  startPeriodicSync
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  const mode = process.argv[2] || 'once'
  
  if (mode === 'periodic') {
    connectDB().then(() => {
      console.log('🔗 Đã kết nối database')
      startPeriodicSync()
    })
  } else {
    runSyncScript()
  }
}