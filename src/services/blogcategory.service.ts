/* eslint-disable @typescript-eslint/no-explicit-any */
import { isExistObject, isValidMongoId, createSlug } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import CateblogModel, { ICateblog } from '~/models/blogcategory.model'

const handleCreateCateblog = async (data: ICateblog) => {
  // Kiểm tra trùng tên
  const existedName = await CateblogModel.findOne({ name: data.name })
  if (existedName) {
    throw new ApiError(StatusCodes.CONFLICT, `Tên danh mục bài viết ${data.name} đã tồn tại.`)
  }

  // Bỏ slug từ client, để pre-save hook tự động tạo
  const { slug, ...createData } = data
  const result = await CateblogModel.create(createData)

  return result.toObject()
}

const handleFetchAllCateblog = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
  const aqpResult = aqp(qs || '')
  const filter = aqpResult.filter || {}
  const sort = aqpResult.sort || {}
  const population = aqpResult.population
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit ? +limit : 10
  const totalItems = await CateblogModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await CateblogModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(Object.keys(sort).length > 0 ? sort : { createdAt: -1 })
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

const handleFetchInfoCateblog = async (cateblogId: string) => {
  isValidMongoId(cateblogId)
  const cateblog = await CateblogModel.findById(cateblogId).lean().exec()
  if (!cateblog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bài viết không tồn tại danh mục này!')
  }
  return cateblog
}

const handleUpdateCateblog = async (cateblogId: string, data: Partial<ICateblog>) => {
  isValidMongoId(cateblogId)

  if (data.name) {
    const existed = await CateblogModel.findOne({ name: data.name, _id: { $ne: cateblogId } })
    if (existed) {
      throw new ApiError(StatusCodes.CONFLICT, `Tên danh mục bài viết ${data.name} đã tồn tại.`)
    }
    
    // Tự động tạo slug mới từ name
    data.slug = createSlug(data.name)
  }

  const cateblog = await CateblogModel.updateOne({ _id: cateblogId }, { ...data })
  if (!cateblog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục bài viết không tồn tại!')
  }
  return cateblog
}

const handleDeleteCateblog = async (cateblogId: string): Promise<any> => {
  isValidMongoId(cateblogId)
  const cateblog = await CateblogModel.deleteById(cateblogId)
  if (!cateblog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bài viết không tồn tại danh mục này!')
  }
  return cateblog
}

export const cateblogService = {
  handleCreateCateblog,
  handleFetchAllCateblog,
  handleFetchInfoCateblog,
  handleUpdateCateblog,
  handleDeleteCateblog
}
