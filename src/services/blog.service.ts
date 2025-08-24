/* eslint-disable @typescript-eslint/no-explicit-any */
import BlogModel, { IBlog } from '~/models/blog.model'
import { isExistObject } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleCreateBlog = async (data: IBlog) => {
  await isExistObject(BlogModel, { slug: data.slug }, { checkExisted: true, errorMessage: 'Slug đã tồn tại' })
  const result = await BlogModel.create({ ...data })
  return result
}

// ...existing code...
const handleFetchAllBlog = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
  let filter: any = {}
  let sort: any = {}
  let population: any = undefined

  // Nếu có từ khóa tìm kiếm
  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        { $or: [{ title: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }] }
      ]
    }
  } else {
    // Nếu không có từ khóa thì parse filter như cũ
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

  const offset = (currentPage - 1) * limit
  const defaultLimit = limit ? limit : 10
  const totalItems = await BlogModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await BlogModel.find(filter)
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
// ...existing code...

const handleFetchInfoBlog = async (blogId: string) => {
  const blog = await BlogModel.findOne({ 
    _id: blogId, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).lean().exec()
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bài viết không tồn tại')
  }
  return blog
}

const handleFetchBlogByCategory = async ({
  categoryId,
  currentPage,
  limit,
  qs
}: {
  categoryId: string
  currentPage: number
  limit: number
  qs: string
}) => {
  const aqpResult = aqp(qs || '')
  const filter = aqpResult?.filter || {}
  const sort = aqpResult?.sort || {}
  const population = aqpResult?.population
  filter.categoryBlogId = categoryId
  delete filter.current
  delete filter.pageSize

  const offset = (currentPage - 1) * limit
  const defaultLimit = limit ? limit : 10
  const totalItems = await BlogModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await BlogModel.find(filter)
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

const handleUpdateBlog = async (blogId: string, data: IBlog) => {
  const blog = await BlogModel.updateOne({ _id: blogId }, { ...data })
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bài viết không tồn tại')
  }
  return blog
}

const handleUpdateBlogStatus = async (blogId: string, data: { isPublic: boolean }) => {
  const blog = await BlogModel.updateOne({ _id: blogId }, { isPublic: data.isPublic })
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bài viết không tồn tại')
  }
  return blog
}

const handleDeleteBlog = async (blogId: string): Promise<any> => {
  const blog = await BlogModel.findByIdAndUpdate(
    blogId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  )
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bài viết không tồn tại')
  }
  return blog
}

const handleFetchTrashBlogs = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
  let filter: any = { isDeleted: true }
  let sort: any = {}
  
  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter = {
      $and: [
        { isDeleted: true },
        { $or: [{ title: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }] }
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

  const totalItems = await BlogModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await BlogModel.find(filter)
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

const handleRestoreBlog = async (blogId: string): Promise<any> => {
  const restored = await BlogModel.findByIdAndUpdate(
    blogId,
    { isDeleted: false, $unset: { deletedAt: 1 } },
    { new: true }
  )
  if (!restored) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bài viết để khôi phục!')
  }
  return restored
}

const handleForceDeleteBlog = async (blogId: string): Promise<any> => {
  const deleted = await BlogModel.findByIdAndDelete(blogId)
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bài viết để xóa!')
  }
  return deleted
}

export const blogService = {
  handleCreateBlog,
  handleFetchAllBlog,
  handleFetchInfoBlog,
  handleFetchBlogByCategory,
  handleUpdateBlog,
  handleUpdateBlogStatus,
  handleDeleteBlog,
  handleFetchTrashBlogs,
  handleRestoreBlog,
  handleForceDeleteBlog
}
