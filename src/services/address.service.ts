/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import AddressModel, { IAddress } from '~/models/address.model'

const handleCreateAddress = async (userId: string, data: Omit<IAddress, 'userId'>) => {
  if (data.isPrimary) {
    await AddressModel.updateMany({ userId, isPrimary: true }, { isPrimary: false })
  }

  const addressData = {
    ...data,
    userId
  }

  const result = await AddressModel.create(addressData)
  return result.toObject()
}

const handleFetchAllAddressByUser = async (
  userId: string,
  {
    currentPage,
    limit,
    qs
  }: {
    currentPage: number
    limit: number
    qs: string
  }
) => {
  const { filter, sort, population } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  filter.userId = userId

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

const handleFetchInfoAddressByUser = async (userId: string, addressId: string) => {
  isValidMongoId(addressId)
  isValidMongoId(userId)
  const address = await AddressModel.findOne({
    _id: addressId,
    userId
  })
    .lean()
    .exec()
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập!')
  }
  return address
}

const handleUpdateAddressByUser = async (userId: string, addressId: string, data: Partial<IAddress>) => {
  isValidMongoId(addressId)
  isValidMongoId(userId)

  const existingAddress = await AddressModel.findOne({
    _id: addressId,
    userId
  })
  if (!existingAddress) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập!')
  }

  if (data.isPrimary === true) {
    await AddressModel.updateMany({ userId, _id: { $ne: addressId }, isPrimary: true }, { isPrimary: false })
  }

  const result = await AddressModel.updateOne({ _id: addressId, userId }, { ...data })
  if (result.matchedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ để cập nhật!')
  }

  const updatedAddress = await AddressModel.findById(addressId).lean()
  return updatedAddress
}

const handleDeleteAddressByUser = async (userId: string, addressId: string): Promise<any> => {
  isValidMongoId(addressId)
  isValidMongoId(userId)

  const existingAddress = await AddressModel.findOne({
    _id: addressId,
    userId
  })
  if (!existingAddress) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập!')
  }

  const address = await AddressModel.deleteById(addressId)
  return address
}

export const addressService = {
  handleCreateAddress,
  handleFetchAllAddressByUser,
  handleFetchInfoAddressByUser,
  handleUpdateAddressByUser,
  handleDeleteAddressByUser
}
