/* eslint-disable @typescript-eslint/no-explicit-any */
import UserModel from '~/models/user.model'
import { hashPassword, isExistObject, isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleCreateUser = async (data: IUser) => {
  await isExistObject(UserModel, { email: data.email }, { checkExisted: true, errorMessage: 'Người dùng đã tồn tại' })
  const hashPass = await hashPassword(data.password as string)
  const result = await UserModel.create({ ...data, password: hashPass })

  const userObj = result.toObject()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete userObj.password

  return userObj
}

const handleFetchAllUser = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
  const { filter, sort, population } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit ? +limit : 10
  const totalItems = await UserModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await UserModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
    .select('-password')
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

const handleFetchInfoUser = async (userId: string) => {
  isValidMongoId(userId)
  const user = await UserModel.findById(userId).select('-password').lean().exec()
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại')
  }
  return user
}

const handleUpdateUser = async (userId: string, data: Partial<IUser>) => {
  isValidMongoId(userId)
  const user = await UserModel.updateOne({ _id: userId }, { ...data })
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại')
  }
  return user
}

const handleDeleteUser = async (userId: string): Promise<any> => {
  isValidMongoId(userId)
  const user = await UserModel.deleteById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại')
  }
  return user
}

export const userService = {
  handleCreateUser,
  handleFetchAllUser,
  handleFetchInfoUser,
  handleUpdateUser,
  handleDeleteUser
}
