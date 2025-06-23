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
import aqp from 'api-query-params'

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

export const ORDER_STATUS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded'
] as const

const handleCreateOrder = async (data: CreateOrderDTO) => {
  console.log('🚀 ~ handleCreateOrder ~ data:', data)
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
          paymentMethod: data.paymentMethod ?? 'credit_card',
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

const handleFetchAllOrders = async (userId: string) => {
  const qs = ''
  const currentPage = 1
  const limit = 10
  const { filter, sort, population } = aqp(qs)

  if (filter.keyword) {
    const keyword = String(filter.keyword).trim()
    delete filter.keyword

    if (keyword) {
      filter.$or = [{ name: { $regex: keyword, $options: 'i' } }, { phone: { $regex: keyword, $options: 'i' } }]
    }
  }

  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit ? +limit : 10
  const totalItems = await OrderModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await OrderModel.find({ userId })
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
    .populate(population)
    .populate('userId', 'name email')
    .populate('addressId')
    .populate('discountId', 'name value type startDate endDate')
    .lean()
    .exec()

  return {
    meta: {
      current: currentPage,
      pageSize: defaultLimit,
      pages: totalPages,
      total: totalItems
    },
    results
  }
}

const handleFetchOrder = async (orderId: string) => {
  const order = await OrderModel.findById(orderId)
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

const handleUpdateStatusOrder = async (orderId: string, status: string) => {
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
  }

  if (!ORDER_STATUS.includes(status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái đơn hàng không hợp lệ')
  }

  const order = await OrderModel.findByIdAndUpdate(orderId, { status }, { new: true })
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

export const orderService = {
  handleCreateOrder,
  handleFetchOrder,
  handleFetchAllOrders,
  handleUpdateStatusOrder,
  handleFetchItemOfOrder
}
