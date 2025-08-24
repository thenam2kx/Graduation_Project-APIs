import DiscountModel, { IDiscounts, DISCOUNT_STATUS } from '~/models/discounts.model'
import DiscountUsageModel from '~/models/discount-usage.model'
import { isExistObject, isValidMongoId, isDiscountValid } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleCreateDiscounts = async (data: IDiscounts) => {
  try {
    await isExistObject(
      DiscountModel,
      { code: data.code },
      { checkExisted: true, errorMessage: 'Mã giảm giá đã tồn tại' }
    )

    // 1. Validate logic ngày tháng
    if (data.endDate <= data.startDate) {
      throw new ApiError(StatusCodes.CONFLICT, 'Ngày kết thúc (endDate) phải sau ngày bắt đầu (startDate)')
    }
    if (data.type === '%') {
      if (data.value <= 0 || data.value > 100) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Với type "%", trường value phải là số > 0 và ≤ 100')
      }
      if (data.max_discount_amount === undefined || data.max_discount_amount === null) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Với type "%", phải cung cấp max_discount_amount để giới hạn giá trị giảm tối đa'
        )
      }
    } else if (data.type === 'Vnd') {
      if (data.value <= 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Với type "Vnd", trường value phải là số > 0')
      }
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Type không hợp lệ, chỉ cho phép "%" hoặc "Vnd"')
    }
    const result = await DiscountModel.create(data)
    return result.toObject()
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, messages.join(', '))
    }
    if (error.code === 11000) {
      throw new ApiError(StatusCodes.CONFLICT, 'Mã giảm giá đã tồn tại trong hệ thống')
    }
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Lỗi tạo mã giảm giá')
  }
}

const handleFetchAllDiscounts = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
  let filter: any = {}
  let sort: any = {}
  let population: any = undefined

  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter.$or = [{ code: { $regex: qs, $options: 'i' } }, { description: { $regex: qs, $options: 'i' } }]
  } else {
    const aqpResult = aqp(qs)
    filter = aqpResult.filter
    sort = aqpResult.sort
    population = aqpResult.population
    delete filter.current
    delete filter.pageSize
  }

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10
  const totalItems = await DiscountModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await DiscountModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
    .populate(population)
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

const handleFetchDiscountsById = async (discountId: string) => {
  isValidMongoId(discountId)
  const discount = await DiscountModel.findById(discountId)
    .lean()
    .exec()
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }
  return discount
}

const handleUpdateDiscounts = async (discountId: string, data: Partial<IDiscounts>) => {
  isValidMongoId(discountId)
  try {
    // Tính toán status dựa trên ngày tháng
    if (data.startDate && data.endDate) {
      const now = new Date()
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      
      if (now < startDate) {
        data.status = DISCOUNT_STATUS.UPCOMING
      } else if (now > endDate) {
        data.status = DISCOUNT_STATUS.ENDED
      } else {
        data.status = DISCOUNT_STATUS.ONGOING
      }
    }

    const discount = await DiscountModel.findByIdAndUpdate(discountId, data, {
      new: true,
      runValidators: true
    }).lean()
    if (!discount) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
    }
    return discount
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, messages.join(', '))
    }

    if (error.code === 11000) {
      throw new ApiError(StatusCodes.CONFLICT, 'Mã giảm giá đã tồn tại trong hệ thống')
    }

    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Lỗi cập nhật mã giảm giá')
  }
}

const handleDeleteDiscounts = async (discountId: string): Promise<any> => {
  isValidMongoId(discountId)
  const discount = await DiscountModel.delete({ _id: discountId })
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }
  return discount
}

const handleApplyDiscount = async (code: string, orderValue: number, userId: string, items?: any[], orderId?: string) => {
  const discount = await DiscountModel.findOne({ code })
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }

  if (!isDiscountValid(discount)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã hết hạn hoặc hết lượt sử dụng')
  }

  // Kiểm tra người dùng đã sử dụng mã giảm giá này chưa
  const existingUsage = await DiscountUsageModel.findOne({
    userId,
    discountId: discount._id
  })
  
  if (existingUsage) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đã sử dụng mã giảm giá này rồi')
  }

  if (orderValue < discount.min_order_value) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Đơn hàng tối thiểu ${discount.min_order_value.toLocaleString('vi-VN')} VNĐ`)
  }

  let discountAmount = 0
  if (discount.type === '%') {
    discountAmount = Math.min((orderValue * discount.value) / 100, discount.max_discount_amount)
  } else {
    discountAmount = Math.min(discount.value, orderValue)
  }

  // Chỉ lưu lịch sử sử dụng nếu có orderId, không trừ usage_limit ở đây
  if (orderId) {
    await DiscountUsageModel.create({
      userId,
      discountId: discount._id,
      orderId
    })
  }

  return {
    discountAmount,
    finalAmount: orderValue - discountAmount,
    discountId: discount._id,
    discount: {
      _id: discount._id,
      code: discount.code,
      description: discount.description,
      type: discount.type,
      value: discount.value
    }
  }
}

const handleGetDiscountByCode = async (code: string, userId?: string) => {
  const discount = await DiscountModel.findOne({ code }).lean()
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }
  
  if (!isDiscountValid(discount)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã hết hạn hoặc hết lượt sử dụng')
  }

  // Kiểm tra người dùng đã sử dụng mã giảm giá này chưa
  if (userId) {
    const existingUsage = await DiscountUsageModel.findOne({
      userId,
      discountId: discount._id
    })
    
    if (existingUsage) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đã sử dụng mã giảm giá này rồi')
    }
  }

  return discount
}

const handleRollbackDiscount = async (discountId: string, orderId?: string) => {
  isValidMongoId(discountId)
  
  const discount = await DiscountModel.findById(discountId)
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }

  await DiscountModel.findByIdAndUpdate(
    discountId,
    { $inc: { usage_limit: 1 } },
    { new: true }
  )

  // Xóa lịch sử sử dụng nếu có orderId
  if (orderId) {
    await DiscountUsageModel.deleteOne({
      discountId,
      orderId
    })
  }

  return { message: 'Hoàn tác mã giảm giá thành công' }
}

export const discountService = {
  handleCreateDiscounts,
  handleFetchAllDiscounts,
  handleFetchDiscountsById,
  handleUpdateDiscounts,
  handleDeleteDiscounts,
  handleApplyDiscount,
  handleGetDiscountByCode,
  handleRollbackDiscount
}