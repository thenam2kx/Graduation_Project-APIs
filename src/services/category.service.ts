/* eslint-disable @typescript-eslint/no-explicit-any */
import CategoryModel, { ICategory } from '~/models/category.model'
import ProductModel from '~/models/product.model'
import { isExistObject, isValidMongoId, createSlug } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'

// Helper function để tạo hoặc lấy danh mục mặc định
const getOrCreateUncategorized = async (session?: mongoose.ClientSession) => {
  // Tìm danh mục mặc định (ưu tiên "khong-xac-dinh")
  let uncategorized = await CategoryModel.findOne({ 
    $or: [
      { slug: 'khong-xac-dinh' },
      { slug: 'danh-muc-mac-dinh' }
    ]
  }).sort({ slug: 1 }).session(session || null)
  
  if (!uncategorized) {
    // Tạo mới nếu không tồn tại
    const createData = {
      name: 'Không xác định',
      description: 'Danh mục mặc định cho các sản phẩm không có danh mục cụ thể',
      isPublic: true,
      isDeleted: false
    }
    
    uncategorized = session 
      ? (await CategoryModel.create([createData], { session }))[0]
      : await CategoryModel.create(createData)
  } else if (uncategorized.isDeleted) {
    // Khôi phục nếu đã bị xóa
    uncategorized = await CategoryModel.findByIdAndUpdate(
      uncategorized._id,
      { isDeleted: false, $unset: { deletedAt: 1 } },
      { new: true, session }
    )
  }
  
  return uncategorized
}

const handleCreateCategory = async (data: ICategory) => {
  // Kiểm tra trùng tên
  const existedName = await CategoryModel.findOne({ 
    name: data.name, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  })
  if (existedName) {
    throw new ApiError(StatusCodes.CONFLICT, `Tên danh mục ${data.name} đã tồn tại.`)
  }
  
  // Bỏ slug từ client, để pre-save hook tự động tạo
  const { slug, ...createData } = data
  const result = await CategoryModel.create({ ...createData, isDeleted: false })
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
    filter = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        { $or: [{ name: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }] }
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
  const category = await CategoryModel.findOne({ 
    _id: categoryId, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).lean().exec()
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại')
  }
  return category
}

const handleUpdateCategory = async (categoryId: string, data: Partial<ICategory>) => {
  isValidMongoId(categoryId)

  if (data.name) {
    const existed = await CategoryModel.findOne({ 
      name: data.name, 
      _id: { $ne: categoryId }, 
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
    })
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
  
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    // 1. Kiểm tra danh mục tồn tại
    const category = await CategoryModel.findById(categoryId).session(session)
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tồn tại')
    }
    
    // 2. Tìm hoặc tạo danh mục "Không xác định"
    const uncategorized = await getOrCreateUncategorized(session)
    
    // 3. Chuyển tất cả sản phẩm thuộc danh mục bị xóa sang danh mục "Không xác định"
    await ProductModel.updateMany(
      { 
        categoryId: categoryId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
      },
      { categoryId: uncategorized._id },
      { session }
    )
    
    // 4. Soft delete danh mục
    const deletedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true, session }
    )
    
    await session.commitTransaction()
    session.endSession()
    
    return deletedCategory
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

const handleFetchTrashCategories = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
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

  const totalItems = await CategoryModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await CategoryModel.find(filter)
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

const handleRestoreCategory = async (categoryId: string): Promise<any> => {
  isValidMongoId(categoryId)

  const restored = await CategoryModel.findByIdAndUpdate(
    categoryId,
    { isDeleted: false, $unset: { deletedAt: 1 } },
    { new: true }
  )
  if (!restored) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy danh mục để khôi phục!')
  }

  return restored
}

const handleForceDeleteCategory = async (categoryId: string): Promise<any> => {
  isValidMongoId(categoryId)
  
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    // 1. Kiểm tra danh mục tồn tại
    const category = await CategoryModel.findById(categoryId).session(session)
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy danh mục để xóa!')
    }
    
    // 2. Tìm hoặc tạo danh mục "Không xác định"
    const uncategorized = await getOrCreateUncategorized(session)
    
    // 3. Chuyển tất cả sản phẩm thuộc danh mục bị xóa sang danh mục "Không xác định"
    await ProductModel.updateMany(
      { categoryId: categoryId },
      { categoryId: uncategorized._id },
      { session }
    )
    
    // 4. Xóa vĩnh viễn danh mục
    const deleted = await CategoryModel.findByIdAndDelete(categoryId).session(session)
    
    await session.commitTransaction()
    session.endSession()
    
    return deleted
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

export const categoryService = {
  handleCreateCategory,
  handleFetchAllCategories,
  handleFetchCategoryById,
  handleUpdateCategory,
  handleDeleteCategory,
  handleFetchTrashCategories,
  handleRestoreCategory,
  handleForceDeleteCategory
}