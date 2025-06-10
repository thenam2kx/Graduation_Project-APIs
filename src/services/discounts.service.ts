import DiscountModel, { IDiscounts } from '~/models/discounts.model'
import { isExistObject, isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleCreateDiscounts = async (data: IDiscounts) => {
  try {
    await isExistObject(DiscountModel, { code: data.code }, { checkExisted: true, errorMessage: 'Mã giảm giá đã tồn tại' })
    const result = await DiscountModel.create(data)
    return result.toObject()
  } catch (error: any) {
    // Nếu là lỗi từ mongoose validation
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, messages)
    }

    // Nếu là lỗi trùng mã (duplicate key)
    if (error.code === 11000) {
      throw new ApiError(StatusCodes.CONFLICT, 'Mã giảm giá đã tồn tại trong hệ thống')
    }

    // Nếu là lỗi khác
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Lỗi tạo mã giảm giá')
  }
}

const handleFetchAllDiscounts = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
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
  const discount = await DiscountModel.findById(discountId).lean().exec()
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }
  return discount
}

const handleUpdateDiscounts = async (discountId: string, data: Partial<IDiscounts>) => {
  isValidMongoId(discountId)
  const discount = await DiscountModel.findByIdAndUpdate(discountId, data, {
    new: true,
    runValidators: true
  }).lean()
  if (!discount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
  }
  return discount
}

const handleDeleteDiscounts = async (discountId: string): Promise<any> => {
  isValidMongoId(discountId)
  const discount = await DiscountModel.findByIdAndDelete(discountId)
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
