/* eslint-disable @typescript-eslint/no-explicit-any */
import CategoryModel, { ICategory } from '~/models/category.model'
import { isExistObject, isValidMongoId, createSlug } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleCreateCategory = async (data: ICategory) => {
  // Kiểm tra trùng tên
  const existedName = await CategoryModel.findOne({ name: data.name })
  if (existedName) {
    throw new ApiError(StatusCodes.CONFLICT, `Tên danh mục ${data.name} đã tồn tại.`)
  }
  
  // Bỏ slug từ client, để pre-save hook tự động tạo
  const { slug, ...createData } = data
  const result = await CategoryModel.create(createData)
  return result.toObject()
}

const handleFetchAllCategories = async ({
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

  // Nếu có từ khóa tìm kiếm
  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter.$or = [{ name: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }]
  } else {
    // Nếu không có từ khóa thì parse filter như cũ
    const aqpResult = aqp(qs || '')
    filter = aqpResult.filter || {}
    sort = aqpResult.sort || {}
    population = aqpResult.population
    delete filter.current
    delete filter.pageSize
  }

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10

  const totalItems = await CategoryModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await CategoryModel.find(filter)
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

const handleFetchCategoryById = async (categoryId: string) => {
  isValidMongoId(categoryId)
  const category = await CategoryModel.findById(categoryId).lean().exec()
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại')
  }
  return category
}

const handleUpdateCategory = async (categoryId: string, data: Partial<ICategory>) => {
  isValidMongoId(categoryId)

  if (data.name) {
    const existed = await CategoryModel.findOne({ name: data.name, _id: { $ne: categoryId } })
    if (existed) {
      throw new ApiError(StatusCodes.CONFLICT, `Tên danh mục ${data.name} đã tồn tại.`)
    }
    
    // Tự động tạo slug mới từ name
    data.slug = createSlug(data.name)
  }

  const category = await CategoryModel.findByIdAndUpdate(categoryId, data, {
    new: true,
    runValidators: true
  }).lean()
  
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại')
  }
  return category
}

const handleDeleteCategory = async (categoryId: string): Promise<any> => {
  isValidMongoId(categoryId)
  const category = await CategoryModel.findByIdAndDelete(categoryId)
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại')
  }
  return category
}

export const categoryService = {
  handleCreateCategory,
  handleFetchAllCategories,
  handleFetchCategoryById,
  handleUpdateCategory,
  handleDeleteCategory
}
