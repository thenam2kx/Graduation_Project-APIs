/* eslint-disable @typescript-eslint/no-explicit-any */
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import CartModel, { ICart } from '~/models/cart.model'

// Tạo giỏ hàng mới
const handleCreateCart = async (data: ICart): Promise<ICart> => {
  const existing = await CartModel.findOne({ userId: data.userId })
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Giỏ hàng cho người dùng này đã tồn tại')
  }

  const result = await CartModel.create(data)
  return result.toObject()
}

// Lấy danh sách giỏ hàng
const handleFetchAllCart = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}): Promise<{
  meta: {
    current: number
    pageSize: number
    pages: number
    total: number
  }
  results: ICart[]
}> => {
  const { filter = {}, sort = {}, population } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (currentPage - 1) * limit
  const totalItems = await CartModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / limit)

  const results = await CartModel.find(filter)
    .skip(offset)
    .limit(limit)
    .sort(sort as any)
    .populate(population)
    .lean()
    .exec()

  return {
    meta: {
      current: currentPage,
      pageSize: limit,
      pages: totalPages,
      total: totalItems
    },
    results
  }
}

// Lấy chi tiết giỏ hàng theo ID
const handleFetchCartInfo = async (id: string): Promise<ICart> => {
  const item = await CartModel.findById(id).lean().exec()
  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy giỏ hàng')
  }
  return item
}

// Cập nhật giỏ hàng
const handleUpdateCart = async (
  id: string,
  data: Partial<ICart>
): Promise<{ acknowledged: boolean; modifiedCount: number; matchedCount: number }> => {
  const item = await CartModel.updateOne({ _id: id }, { $set: data })
  if (!item.matchedCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không thể cập nhật: giỏ hàng không tồn tại')
  }
  return item
}

// Xoá giỏ hàng
const handleDeleteCart = async (id: string): Promise<{ acknowledged: boolean; deletedCount: number }> => {
  const result = await CartModel.deleteOne({ _id: id })
  if (!result.deletedCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không thể xoá: giỏ hàng không tồn tại')
  }
  return result
}

export const CartService = {
  handleCreateCart,
  handleFetchAllCart,
  handleFetchCartInfo,
  handleUpdateCart,
  handleDeleteCart
}
