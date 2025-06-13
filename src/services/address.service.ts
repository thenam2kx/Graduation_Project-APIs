/* eslint-disable @typescript-eslint/no-explicit-any */
import { isExistObject, isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import AddressModel, { IAddress } from '~/models/address.model'

const handleCreateAddress = async (data: IAddress) => {
  const result = await AddressModel.create(data)
  return result.toObject()
}

const handleFetchAllAddress = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
  const { filter, sort, population } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10
  const totalItems = await AddressModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await AddressModel.find(filter)
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

const handleFetchInfoAddress = async (addressId: string) => {
  isValidMongoId(addressId)
  const address = await AddressModel.findById(addressId).lean().exec()
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ!')
  }
  return address
}

const handleUpdateAddress = async (addressId: string, data: Partial<IAddress>) => {
  isValidMongoId(addressId)
  const result = await AddressModel.updateOne({ _id: addressId }, { ...data })
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ để cập nhật!')
  }
  return result
}

const handleDeleteAddress = async (addressId: string): Promise<any> => {
  isValidMongoId(addressId)
  const address = await AddressModel.deleteById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ để xóa!')
  }
  return address
}

export const addressService = {
  handleCreateAddress,
  handleFetchAllAddress,
  handleFetchInfoAddress,
  handleUpdateAddress,
  handleDeleteAddress
}
