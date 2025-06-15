import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import FlashSaleModel from '~/models/flash_sale.model'
import { Types } from 'mongoose'

export interface IFlashSale {
  name: string
  description?: string
  startDate: Date
  endDate: Date
}

const handleCreateFlashSale = async (flashSaleData: IFlashSale) => {
  try {
    // Kiểm tra trùng tên
    const existed = await FlashSaleModel.findOne({ name: flashSaleData.name })
    if (existed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Flash sale đã tồn tại!')
    }
    const created = await FlashSaleModel.create(flashSaleData)
    return created.toObject()
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Có lỗi xảy ra trong quá trình tạo flash sale!')
  }
}

const handleFetchAllFlashSales = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
  const { filter, sort } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10

  const totalItems = await FlashSaleModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await FlashSaleModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
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

const handleFetchInfoFlashSale = async (flashSaleId: string) => {
  if (!Types.ObjectId.isValid(flashSaleId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID flash sale không hợp lệ')
  }
  const flashSale = await FlashSaleModel.findById(flashSaleId).lean().exec()
  if (!flashSale) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Flash sale không tồn tại!')
  }
  return flashSale
}

const handleUpdateFlashSale = async (flashSaleId: string, flashSaleData: IFlashSale) => {
  if (!Types.ObjectId.isValid(flashSaleId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID flash sale không hợp lệ')
  }
  const updated = await FlashSaleModel.findByIdAndUpdate(flashSaleId, { $set: flashSaleData }, { new: true }).lean()
  if (!updated) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Flash sale không tồn tại!')
  }
  return updated
}

const handleDeleteFlashSale = async (flashSaleId: string) => {
  if (!Types.ObjectId.isValid(flashSaleId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID flash sale không hợp lệ')
  }
  const deleted = await FlashSaleModel.delete({ _id: flashSaleId })
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Flash sale không tồn tại!')
  }
  return { message: 'Xóa flash sale thành công (soft-delete)' }
}

export const flashSaleService = {
  handleCreateFlashSale,
  handleFetchAllFlashSales,
  handleFetchInfoFlashSale,
  handleUpdateFlashSale,
  handleDeleteFlashSale
}
