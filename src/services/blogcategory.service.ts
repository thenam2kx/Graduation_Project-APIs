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
  let filter: any = {}
  let sort: any = {}
  let population: any = undefined

  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        { $or: [{ name: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }] }
      ]
    }
  } else {
    const aqpResult = aqp(qs || '')
    const baseFilter = aqpResult.filter || {}
    filter = {
      ...baseFilter,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    }
    sort = aqpResult.sort || {}
    population = aqpResult.population
    delete filter.current
    delete filter.pageSize
  }

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
  const cateblog = await CateblogModel.findOne({ 
    _id: cateblogId, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).lean().exec()
  if (!cateblog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục bài viết không tồn tại!')
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
  const cateblog = await CateblogModel.findByIdAndUpdate(
    cateblogId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  )
  if (!cateblog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục bài viết không tồn tại!')
  }
  return cateblog
}

const handleFetchTrashCateblogs = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
  let filter: any = { isDeleted: true }
  let sort: any = {}
  
  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter = {
      $and: [
        { isDeleted: true },
        { $or: [{ name: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }] }
      ]
    }
  } else {
    const aqpResult = aqp(qs || '')
    const baseFilter = aqpResult.filter || {}
    filter = { ...baseFilter, isDeleted: true }
    sort = aqpResult.sort || {}
    delete filter.current
    delete filter.pageSize
  }

  const offset = (currentPage - 1) * limit
  const defaultLimit = limit || 10

  const totalItems = await CateblogModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await CateblogModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(Object.keys(sort).length > 0 ? sort : { deletedAt: -1 })
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

const handleRestoreCateblog = async (cateblogId: string): Promise<any> => {
  isValidMongoId(cateblogId)
  const restored = await CateblogModel.findByIdAndUpdate(
    cateblogId,
    { isDeleted: false, $unset: { deletedAt: 1 } },
    { new: true }
  )
  if (!restored) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy danh mục bài viết để khôi phục!')
  }
  return restored
}

const handleForceDeleteCateblog = async (cateblogId: string): Promise<any> => {
  isValidMongoId(cateblogId)
  const deleted = await CateblogModel.findByIdAndDelete(cateblogId)
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy danh mục bài viết để xóa!')
  }
  return deleted
}

export const cateblogService = {
  handleCreateCateblog,
  handleFetchAllCateblog,
  handleFetchInfoCateblog,
  handleUpdateCateblog,
  handleDeleteCateblog,
  handleFetchTrashCateblogs,
  handleRestoreCateblog,
  handleForceDeleteCateblog
}
