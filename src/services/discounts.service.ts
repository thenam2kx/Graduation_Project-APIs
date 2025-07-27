import DiscountModel, { IDiscounts } from '~/models/discounts.model'
import { isExistObject, isValidMongoId } from '~/utils/utils'
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
    .populate('applies_category', 'name')
    .populate('applies_product', 'name')
    .populate('applies_variant', 'sku')
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
    .populate('applies_category', 'name')
    .populate('applies_product', 'name')
    .populate('applies_variant', 'sku')
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

export const discountService = {
  handleCreateDiscounts,
  handleFetchAllDiscounts,
  handleFetchDiscountsById,
  handleUpdateDiscounts,
  handleDeleteDiscounts
}