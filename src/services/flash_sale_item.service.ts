import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import FlashSaleItemModel from '~/models/flash_sale_item.model'
import { Types } from 'mongoose'

export interface IFlashSaleItem {
  flashSaleId: string
  productId: string
  variantId: string
  discountPercent: number
}

const handleCreateFlashSaleItem = async (data: IFlashSaleItem) => {
  // Kiểm tra trùng sản phẩm trong cùng flash sale
  const existed = await FlashSaleItemModel.findOne({
    flashSaleId: data.flashSaleId,
    productId: data.productId,
    variantId: data.variantId
  })
  if (existed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm đã có trong flash sale này!')
  }
  const created = await FlashSaleItemModel.create(data)
  return created.toObject()
}

const handleFetchAllFlashSaleItems = async ({
  flashSaleId,
  currentPage,
  limit
}: {
  flashSaleId?: string
  currentPage: number
  limit: number
}) => {
  const filter: any = {}
  if (flashSaleId) filter.flashSaleId = flashSaleId

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10

  const totalItems = await FlashSaleItemModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await FlashSaleItemModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .populate({ path: 'productId', select: 'name price image' })
    .populate({ path: 'variantId', select: 'sku price stock' })
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

const handleFetchInfoFlashSaleItem = async (itemId: string) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID flash sale item không hợp lệ')
  }
  const item = await FlashSaleItemModel.findById(itemId)
    .populate({ path: 'productId', select: 'name price image' })
    .populate({ path: 'variantId', select: 'sku price stock' })
    .lean()
    .exec()
  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Flash sale item không tồn tại!')
  }
  return item
}

const handleUpdateFlashSaleItem = async (itemId: string, data: Partial<IFlashSaleItem>) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID flash sale item không hợp lệ')
  }
  const updated = await FlashSaleItemModel.findByIdAndUpdate(itemId, { $set: data }, { new: true }).lean()
  if (!updated) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Flash sale item không tồn tại!')
  }
  return updated
}

const handleDeleteFlashSaleItem = async (itemId: string) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID flash sale item không hợp lệ')
  }
  const deleted = await FlashSaleItemModel.delete({ _id: itemId })
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Flash sale item không tồn tại!')
  }
  return { message: 'Xóa flash sale item thành công (soft-delete)' }
}

export const flashSaleItemService = {
  handleCreateFlashSaleItem,
  handleFetchAllFlashSaleItems,
  handleFetchInfoFlashSaleItem,
  handleUpdateFlashSaleItem,
  handleDeleteFlashSaleItem
}
