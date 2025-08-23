import { isExistObject } from '~/utils/utils'
import OrderModel from '../models/order.model'
import mongoose from 'mongoose'
import UserModel from '~/models/user.model'
import AddressModel from '~/models/address.model'
import DiscountModel from '~/models/discounts.model'
import ApiError from '~/utils/ApiError'
import ProductModel from '~/models/product.model'
import ProductVariantModel from '~/models/product-variant.model'
import { StatusCodes } from 'http-status-codes'
import OrderItemModel, { IOrderItem } from '~/models/orderItems.model'
import { sendEmail } from '~/utils/sendEmail'

interface OrderItemInput {
  productId: string
  variantId: string
  quantity: number
  price: number
}
export interface CreateOrderDTO {
  userId: string
  addressId: string
  addressFree: string
  totalPrice: number
  shippingPrice: number
  discountId?: string | null
  status?: string
  shippingMethod?: string
  paymentMethod?: string
  paymentStatus?: string
  note?: string
  items: OrderItemInput[]
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đã gửi hàng',
  delivered: 'Đã giao hàng',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền'
}
export const ORDER_STATUS = Object.keys(ORDER_STATUS_LABELS)

const handleCreateOrder = async (data: CreateOrderDTO) => {
  console.log('🚀 ~ handleCreateOrder ~ data:', data)
  console.log('Creating order with payment method:', data.paymentMethod)
  console.log('Address data:', { addressId: data.addressId, addressFree: data.addressFree })
  
  // Log chi tiết về addressFree
  if (data.addressFree) {
    console.log('AddressFree details:', JSON.stringify(data.addressFree))
  }
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // 1. Validate các tham chiếu ngoại
    const userData = await UserModel.findById(data.userId).lean();
    if (!userData) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User không tồn tại');
    }
    console.log('Found user data:', userData);
    
    // Kiểm tra và lấy thông tin địa chỉ nếu có
    let addressData = null;
    if (data.addressId) {
      addressData = await AddressModel.findById(data.addressId).lean();
      if (!addressData) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Address không tồn tại');
      }
      console.log('Found address data:', addressData);
    }
    let discountPercent = 0
    let discountAmount = 0
    if (data.discountId) {
      const discount = await DiscountModel.findById(data.discountId)
      if (!discount) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Discount không tồn tại')
      }
      // kiểm tra thời gian
      const now = new Date()
      if (discount?.startDate > now || discount?.endDate < now) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Discount không còn hiệu lực')
      }
      // tính discountAmount giả sử type Vnd hoặc %
      if (discount?.type === '%') {
        discountPercent = discount?.value
        const itemsTotal = data.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
        discountAmount = Math.min((itemsTotal * discountPercent) / 100, discount?.max_discount_amount!)
      } else {
        discountAmount = discount?.value
      }
    }

    // 2. Validate items
    if (!data.items?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Phải có ít nhất 1 item trong đơn hàng')
    }
    // kiểm existence & stock nếu cần
    for (const it of data.items) {
      // Validate ObjectId format first
      if (!mongoose.isValidObjectId(it.productId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Product ID không hợp lệ: ${it.productId}`)
      }
      if (!mongoose.isValidObjectId(it.variantId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Variant ID không hợp lệ: ${it.variantId}`)
      }

      // Check product existence
      const product = await ProductModel.findOne({ _id: it.productId, isDeleted: false }).lean()
      if (!product) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Sản phẩm với ID ${it.productId} không tồn tại hoặc đã bị xóa`)
      }

      // Check variant existence and stock
      const variant = await ProductVariantModel.findOne({ _id: it.variantId }).lean()
      if (!variant) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Biến thể sản phẩm với ID ${it.variantId} không tồn tại`)
      }

      // Check if variant belongs to the product
      if (variant.productId.toString() !== it.productId.toString()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Biến thể ${it.variantId} không thuộc về sản phẩm ${it.productId}`)
      }

      // Check stock availability
      if (variant.stock < it.quantity) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Không đủ hàng trong kho. Còn lại: ${variant.stock}, yêu cầu: ${it.quantity}`)
      }

      if (it.quantity < 1 || it.price < 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Quantity phải ≥1 và price phải ≥0')
      }
    }

    // 3. Tính lại tổng và so sánh với client
    const itemsTotal = data.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
    const expectedTotal = itemsTotal + data.shippingPrice - discountAmount
    if (expectedTotal !== data.totalPrice) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Sai tổng tiền: tính ra ${expectedTotal}, nhưng client gửi ${data.totalPrice}`
      )
    }

    // 4. Tạo Order
    const orderData = {
      userId: data.userId,
      addressId: data.addressId,
      addressFree: data.addressFree || null,
      totalPrice: data.totalPrice,
      shippingPrice: data.shippingPrice,
      discountId: data.discountId ?? null,
      status: data.status ?? 'pending',
      shippingMethod: data.shippingMethod ?? 'standard',
      paymentMethod: data.paymentMethod ?? 'cash',
      paymentStatus: data.paymentMethod === 'vnpay' ? 'paid' : 'unpaid', // Nếu thanh toán VNPAY thì đã thanh toán
      note: data.note ?? ''
    };
    
    // Nếu có addressId và đã tìm thấy thông tin địa chỉ, sao chép thông tin vào addressFree
    if (addressData && !orderData.addressFree) {
      console.log('Copying address data to addressFree');
      orderData.addressFree = {
        receiverName: userData?.fullName || userData?.name || 'Không có tên',
        receiverPhone: userData?.phone || '',
        province: addressData.province || '',
        district: addressData.district || '',
        ward: addressData.ward || '',
        address: addressData.address || ''
      };
    }
    
    console.log('Creating order with data:', orderData);
    const orderDoc = await OrderModel.create([orderData], { session })
    const order = orderDoc[0]

    // 5. Tạo OrderItem
    const itemsToInsert = data.items.map((it) => ({
      orderId: order._id,
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      price: it.price
    }))
    const orderItems = await OrderItemModel.insertMany(itemsToInsert, { session })

    // Cập nhật stock và flash sale sold quantity
    for (const it of data.items) {
      await ProductVariantModel.updateOne({ _id: it.variantId }, { $inc: { stock: -it.quantity } }, { session })
      
      // Cập nhật số lượng đã bán cho flash sale items
      const FlashSaleItemModel = require('~/models/flash_sale_item.model').default
      const now = new Date()
      
      const flashSaleItem = await FlashSaleItemModel.findOne({
        productId: it.productId,
        variantId: it.variantId,
        deleted: false
      }).populate({
        path: 'flashSaleId',
        match: {
          startDate: { $lte: now },
          endDate: { $gte: now },
          isActive: true,
          deleted: false
        }
      }).session(session)
      
      if (flashSaleItem && flashSaleItem.flashSaleId) {
        await FlashSaleItemModel.updateOne(
          { _id: flashSaleItem._id },
          { $inc: { soldQuantity: it.quantity } },
          { session }
        )
      }
    }

    // 6. Commit
    await session.commitTransaction()
    session.endSession()

    // trả về kèm items
    return order.toObject({
      virtuals: false,
      getters: false,
      versionKey: false,
      transform: (_doc, ret) => ret
    }) as any & {
      items: IOrderItem[]
    }
  } catch (err: any) {
    await session.abortTransaction()
    session.endSession()

    // Mongoose validation
    if (err.name === 'ValidationError') {
      const msgs = Object.values(err.errors).map((e: any) => e.message)
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, msgs.join(', '))
    }
    // Duplicate key
    if (err.code === 11000) {
      throw new ApiError(StatusCodes.CONFLICT, 'Trùng key khi tạo order')
    }
    // ApiError throw lên
    if (err instanceof ApiError) {
      throw err
    }
    // Unexpected
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, err.message || 'Lỗi tạo đơn hàng')
  }
}

const handleFetchAllOrders = async (
  userId: string,
  options: { page: number; limit: number; sort: string; status?: string }
) => {
  const { page = 1, limit = 10, sort = '-createdAt', status } = options

  const filter: any = { userId: new mongoose.Types.ObjectId(userId) }
  if (status) filter.status = status

  const offset = (page - 1) * limit
  const totalItems = await OrderModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / limit)

  // 1. Lấy danh sách đơn hàng
  const orders = await OrderModel.find(filter)
    .skip(offset)
    .limit(limit)
    .sort(sort)
    .populate('userId', 'fullName email phone')
    .populate('addressId')
    .populate('discountId', 'name value type startDate endDate')
    .lean()

  // 2. Gán nhãn trạng thái
  orders.forEach((order) => {
    order.statusLabel = ORDER_STATUS_LABELS[order.status] || order.status
  })

  // 3. Lấy danh sách các orderId
  const orderIds = orders.map((order) => order._id)

  // 4. Lấy tất cả OrderItem tương ứng
  const orderItems = await OrderItemModel.find({ orderId: { $in: orderIds } })
    .populate('productId', 'name image capacity')
    .populate({
      path: 'variantId',
      select: 'sku color size',
      populate: {
        path: 'variant_attributes',
        populate: {
          path: 'attributeId',
          select: 'name slug'
        }
      }
    })
    .lean()

  // 5. Gộp items vào từng đơn
  const orderItemsMap = new Map<string, any[]>()
  for (const item of orderItems) {
    const id = item.orderId.toString()
    if (!orderItemsMap.has(id)) {
      orderItemsMap.set(id, [])
    }
    orderItemsMap.get(id)?.push(item)
  }

  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: orderItemsMap.get(order._id.toString()) || []
  }))

  return {
    meta: {
      current: page,
      pageSize: limit,
      pages: totalPages,
      total: totalItems
    },
    results: ordersWithItems
  }
}

const handleFetchOrder = async (orderId: string) => {
  const order = await OrderModel.findById(orderId)
    .populate('userId', 'fullName email phone')
    .populate('addressId')
    .populate('discountId', 'name value type startDate endDate')
    .lean()
    .exec()

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }
  order.statusLabel = ORDER_STATUS_LABELS[order.status] || order.status
  return order
}

const handleUpdateStatusOrder = async (orderId: string, status: string, reason?: string) => {
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
  }

  if (!ORDER_STATUS.includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái đơn hàng không hợp lệ')
  }

  const currentOrder = await OrderModel.findById(orderId)
  if (!currentOrder) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }

  const currentStatus = currentOrder.status
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing'],
    processing: ['shipped'],
    shipped: ['delivered'],
    delivered: ['completed', 'refunded'],
    completed: ['refunded'],
    cancelled: [],
    refunded: []
  }

  if (!validTransitions[currentStatus].includes(status) && status !== currentStatus) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Không thể chuyển trạng thái từ "${currentStatus}" sang "${status}". Các trạng thái hợp lệ: ${validTransitions[currentStatus].join(', ')}`
    )
  }

  const updateData: any = { status }

  if (['cancelled', 'refunded'].includes(status) && reason) {
    updateData.reason = reason // ✅ Lúc này mới thực sự cập nhật
  }

  // Cập nhật trạng thái thanh toán dựa trên trạng thái đơn hàng
  if (status === 'delivered' && currentOrder.paymentMethod === 'cash') {
    updateData.paymentStatus = 'paid'
    console.log(`Cập nhật trạng thái thanh toán của đơn hàng ${orderId} thành 'đã thanh toán'`)
  } else if (status === 'cancelled') {
    updateData.paymentStatus = 'cancelled'
    console.log(`Cập nhật trạng thái thanh toán của đơn hàng ${orderId} thành 'đã hủy'`)
  } else if (status === 'completed' && currentOrder.paymentMethod !== 'cash') {
    updateData.paymentStatus = 'paid'
    console.log(`Cập nhật trạng thái thanh toán của đơn hàng ${orderId} thành 'đã thanh toán'`)
  }

  const order = await OrderModel.findByIdAndUpdate(orderId, updateData, { new: true })
    .populate('userId', 'fullName name email phone')
    .populate('addressId', 'province district ward address')
    .populate('discountId', 'name value type startDate endDate')
    .lean()
    .exec()

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }

  const user = await UserModel.findById(order.userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User không tồn tại')
  }

  // Lấy thông tin chi tiết đơn hàng để gửi email
  const orderItems = await OrderItemModel.find({ orderId: order._id })
    .populate('productId', 'name image')
    .populate('variantId', 'sku color size')
    .lean()
    .exec()

  sendEmail(user.email, `Cập nhật đơn hàng #${order._id}`, 'order-status', {
    orderId: order._id,
    customerName: user.fullName || user.name,
    currentStatus: ORDER_STATUS_LABELS[order.status] || order.status,
    orderInfo: {
      totalPrice: order.totalPrice,
      shippingPrice: order.shippingPrice,
      paymentMethod: order.paymentMethod,
      shippingMethod: order.shippingMethod,
      note: order.note,
      createdAt: order.createdAt
    },
    items: orderItems,
    address: order.addressFree || order.addressId
  })

  return order
}

const handleFetchItemOfOrder = async (orderId: string) => {
  const order = await OrderItemModel.find({ orderId }).populate('productId').populate('variantId').lean().exec()

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }

  return order
}

const handleCancelOrder = async (orderId: string, reason:string) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // Tìm đơn hàng theo ID
    const order = await OrderModel.findById(orderId).session(session)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đơn hàng không tồn tại')
    }

    // Kiểm tra trạng thái đơn hàng - chỉ cho phép hủy đơn hàng ở trạng thái chờ xác nhận
    if (order.status !== 'pending') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy đơn hàng đã được xử lý')
    }

    // Cập nhật trạng thái đơn hàng thành 'cancelled' và trạng thái thanh toán thành 'cancelled'
    order.status = 'cancelled'
    order.reason = reason
    order.paymentStatus = 'cancelled'
    await order.save({ session })

    // Lấy tất cả các mục trong đơn hàng
    const orderItems = await OrderItemModel.find({ orderId: order._id }).session(session)

    // Cộng lại số lượng sản phẩm vào kho và trừ lại flash sale sold quantity
    for (const item of orderItems) {
      await ProductVariantModel.updateOne({ _id: item.variantId }, { $inc: { stock: item.quantity } }, { session })
      
      // Trừ lại số lượng đã bán cho flash sale items
      const FlashSaleItemModel = require('~/models/flash_sale_item.model').default
      const now = new Date()
      
      const flashSaleItem = await FlashSaleItemModel.findOne({
        productId: item.productId,
        variantId: item.variantId,
        deleted: false
      }).populate({
        path: 'flashSaleId',
        match: {
          startDate: { $lte: now },
          endDate: { $gte: now },
          isActive: true,
          deleted: false
        }
      }).session(session)
      
      if (flashSaleItem && flashSaleItem.flashSaleId) {
        await FlashSaleItemModel.updateOne(
          { _id: flashSaleItem._id },
          { $inc: { soldQuantity: -item.quantity } },
          { session }
        )
      }
    }

    // KHÔNG xóa các mục trong đơn hàng nữa
    // await OrderItemModel.deleteMany({ orderId: order._id }).session(session)

    // Commit transaction
    await session.commitTransaction()
    session.endSession()

    return { message: 'Đơn hàng đã được hủy thành công', order }
  } catch (err: any) {
    await session.abortTransaction()
    session.endSession()

    // Xử lý lỗi
    if (err instanceof ApiError) {
      throw err
    }
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, err.message || 'Lỗi khi hủy đơn hàng')
  }
}



export const orderService = {
  handleCreateOrder,
  handleFetchOrder,
  handleFetchAllOrders,
  handleUpdateStatusOrder,
  handleFetchItemOfOrder,
  handleCancelOrder
}