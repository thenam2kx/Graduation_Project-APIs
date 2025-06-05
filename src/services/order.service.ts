/* eslint-disable @typescript-eslint/no-explicit-any */
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import OrderItemModel, { IOrderItem } from '~/models/orderItems.model'

const handleCreateOrderItem = async (data: IOrderItem): Promise<IOrderItem> => {
  const result = await OrderItemModel.create({ ...data })
  return result.toObject()
}

const handleFetchAllOrderItems = async ({
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
  results: IOrderItem[]
}> => {
  const aqpResult = aqp(qs)
  const filter = aqpResult.filter || {}
  const sort = aqpResult.sort || {}
  const population = aqpResult.population

  delete filter.current
  delete filter.pageSize

  const offset = (currentPage - 1) * limit
  const totalItems = await OrderItemModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / limit)

  const results = await OrderItemModel.find(filter)
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

const handleFetchOrderItemInfo = async (id: string): Promise<IOrderItem> => {
  const item = await OrderItemModel.findById(id).lean().exec()
  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy mục đơn hàng')
  }
  return item
}

const handleUpdateOrderItem = async (
  id: string,
  data: Partial<IOrderItem>
): Promise<{ acknowledged: boolean; modifiedCount: number; upsertedId: any; upsertedCount: number; matchedCount: number }> => {
  const item = await OrderItemModel.updateOne({ _id: id }, { ...data })
  if (!item.modifiedCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không thể cập nhật: mục đơn hàng không tồn tại')
  }
  return item
}

const handleDeleteOrderItem = async (id: string): Promise<IOrderItem> => {
  const item = await OrderItemModel.findByIdAndDelete(id).lean().exec()
  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không thể xóa: mục đơn hàng không tồn tại')
  }
  return item
}

export const orderItemService: {
  handleCreateOrderItem: (data: IOrderItem) => Promise<IOrderItem>
  handleFetchAllOrderItems: (params: {
    currentPage: number
    limit: number
    qs: string
  }) => Promise<{
    meta: {
      current: number
      pageSize: number
      pages: number
      total: number
    }
    results: IOrderItem[]
  }>
  handleFetchOrderItemInfo: (id: string) => Promise<IOrderItem>
  handleUpdateOrderItem: (
    id: string,
    data: Partial<IOrderItem>
  ) => Promise<{ acknowledged: boolean; modifiedCount: number; upsertedId: any; upsertedCount: number; matchedCount: number }>
  handleDeleteOrderItem: (id: string) => Promise<IOrderItem>
} = {
  handleCreateOrderItem,
  handleFetchAllOrderItems,
  handleFetchOrderItemInfo,
  handleUpdateOrderItem,
  handleDeleteOrderItem
}
