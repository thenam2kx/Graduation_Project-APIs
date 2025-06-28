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
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền'
}
export const ORDER_STATUS = Object.keys(ORDER_STATUS_LABELS)

const handleCreateOrder = async (data: CreateOrderDTO) => {
  console.log('🚀 ~ handleCreateOrder ~ data:', data)
  console.log('Creating order with payment method:', data.paymentMethod)
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // 1. Validate các tham chiếu ngoại
    await isExistObject(UserModel, { _id: data.userId }, { checkExisted: false, errorMessage: 'User không tồn tại' })
    if (data.addressId) {
      await isExistObject(
        AddressModel,
        { _id: data.addressId },
        { checkExisted: false, errorMessage: 'Address không tồn tại' }
      )
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
      await isExistObject(
        ProductModel,
        { _id: it.productId },
        { checkExisted: false, errorMessage: 'Product không tồn tại' }
      )
      await isExistObject(
        ProductVariantModel,
        { _id: it.variantId },
        { checkExisted: false, errorMessage: 'Variant không tồn tại' }
      )
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
    const orderDoc = await OrderModel.create(
      [
        {
          userId: data.userId,
          addressId: data.addressId,
          addressFree: data.addressFree,
          totalPrice: data.totalPrice,
          shippingPrice: data.shippingPrice,
          discountId: data.discountId ?? null,
          status: data.status ?? 'pending',
          shippingMethod: data.shippingMethod ?? 'standard',
          paymentMethod: data.paymentMethod ?? 'cash',
          paymentStatus: data.paymentStatus ?? 'unpaid',
          note: data.note ?? ''
        }
      ],
      { session }
    )
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

    for (const it of data.items) {
      await ProductVariantModel.updateOne({ _id: it.variantId }, { $inc: { stock: -it.quantity } }, { session })
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
    .populate('productId', 'name image')
    .populate('variantId', 'sku color size')
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

const handleUpdateStatusOrder = async (orderId: string, status: string, reason?:string) => {
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
  }

  if (!ORDER_STATUS.includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái đơn hàng không hợp lệ')
  }
  const updateUpload: any = { status }
  if (['cancelled', 'refunded'].includes(status) && (reason)){
    updateUpload.reason = reason
  }

  // Lấy thông tin đơn hàng hiện tại
  const currentOrder = await OrderModel.findById(orderId)
  if (!currentOrder) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }

  // Kiểm tra quy trình cập nhật trạng thái
  const currentStatus = currentOrder.status
  const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': ['completed', 'refunded'],
    'completed': ['refunded'],
    'cancelled': [],
    'refunded': []
  }

  // Kiểm tra xem trạng thái mới có hợp lệ không
  if (!validTransitions[currentStatus].includes(status) && status !== currentStatus) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST, 
      `Không thể chuyển trạng thái từ "${currentStatus}" sang "${status}". Các trạng thái hợp lệ: ${validTransitions[currentStatus].join(', ')}`
    )
  }

  // Cập nhật trạng thái thanh toán nếu cần
  let updateData: any = { status }
  
  // Nếu đơn hàng có phương thức thanh toán tiền mặt và trạng thái mới là 'đã giao hàng'
  // thì cập nhật trạng thái thanh toán thành 'đã thanh toán'
  if (currentOrder.paymentMethod === 'cash' && status === 'delivered') {
    updateData.paymentStatus = 'paid'
    console.log(`Cập nhật trạng thái thanh toán của đơn hàng ${orderId} thành 'đã thanh toán'`)
  }

  // Cập nhật trạng thái đơn hàng
  const order = await OrderModel.findByIdAndUpdate(orderId, updateData, { new: true })
    .populate('userId', 'name email')
    .populate('addressId')
    .populate('discountId', 'name value type startDate endDate')
    .lean()
    .exec()

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }
  return order
}

const handleFetchItemOfOrder = async (orderId: string) => {
  const order = await OrderItemModel.find({ orderId }).populate('productId').populate('variantId').lean().exec()

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order không tồn tại')
  }

  return order
}

const handleCancelOrder = async (orderId: string) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // Tìm đơn hàng theo ID
    const order = await OrderModel.findById(orderId).session(session)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đơn hàng không tồn tại')
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.status !== 'pending' && order.status !== 'processing') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy đơn hàng ở trạng thái hiện tại')
    }

    // Cập nhật trạng thái đơn hàng thành 'cancelled'
    order.status = 'cancelled'
    await order.save({ session })

    // Lấy tất cả các mục trong đơn hàng
    const orderItems = await OrderItemModel.find({ orderId: order._id }).session(session)

    // Cộng lại số lượng sản phẩm vào kho
    for (const item of orderItems) {
      await ProductVariantModel.updateOne({ _id: item.variantId }, { $inc: { stock: item.quantity } }, { session })
    }

    await OrderItemModel.deleteMany({ orderId: order._id }).session(session)

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

// Hàm mới để lấy tất cả đơn hàng cho Admin
const handleFetchAllOrdersForAdmin = async (filter: any, sort: any, pagination: any) => {
  try {
    console.log('handleFetchAllOrdersForAdmin called with:', { filter, sort, pagination })
    const currentPage = pagination?.page || 1
    const limit = pagination?.limit || 10

    if (filter.keyword) {
      const keyword = String(filter.keyword).trim()
      delete filter.keyword

      if (keyword) {
        filter.$or = [
          { '_id': { $regex: keyword, $options: 'i' } },
          { 'status': { $regex: keyword, $options: 'i' } },
          { 'paymentMethod': { $regex: keyword, $options: 'i' } }
        ]
      }
    }

    delete filter.current
    delete filter.pageSize

    const offset = (+currentPage - 1) * +limit
    const defaultLimit = +limit ? +limit : 10
    
    // Đếm tổng số đơn hàng trong database
    const allOrdersCount = await OrderModel.countDocuments({})
    console.log('Total orders in database:', allOrdersCount)
    
    // Hiển thị tất cả các đơn hàng trong database
    const allOrders = await OrderModel.find({}).lean().exec()
    console.log('All orders in database:', allOrders.map(order => ({
      id: order._id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    })))
    
    const totalItems = await OrderModel.countDocuments(filter)
    console.log('Orders matching filter:', totalItems)
    
    const totalPages = Math.ceil(totalItems / defaultLimit)

    // Lấy danh sách đơn hàng
    const results = await OrderModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate('userId', 'name email')
      .populate('addressId')
      .populate('discountId', 'name value type startDate endDate')
      .lean()
      .exec()

    console.log('Orders found after query:', results.length)

    // Lấy thêm thông tin các sản phẩm trong đơn hàng
    const ordersWithItems = await Promise.all(
      results.map(async (order) => {
        const items = await OrderItemModel.find({ orderId: order._id })
          .populate('productId')
          .populate('variantId')
          .lean()
          .exec()
        console.log(`Order ${order._id} has ${items.length} items`)
        return { ...order, items }
      })
    )

    return {
      meta: {
        current: currentPage,
        pageSize: defaultLimit,
        pages: totalPages,
        total: totalItems
      },
      results: ordersWithItems
    }
  } catch (error) {
    console.error('Error fetching all orders for admin:', error)
    throw error
  }
}

export const orderService = {
  handleCreateOrder,
  handleFetchOrder,
  handleFetchAllOrders,
  handleUpdateStatusOrder,
  handleFetchItemOfOrder,
  handleCancelOrder,
  handleFetchAllOrdersForAdmin
}
