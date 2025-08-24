/* eslint-disable @typescript-eslint/no-explicit-any */
import BrandModel, { IBrand } from '~/models/brand.model'
import ProductModel from '~/models/product.model'
import { createSlug, isExistObject, isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'

// Helper function để tạo hoặc lấy thương hiệu mặc định
const getOrCreateUncategorizedBrand = async (session?: mongoose.ClientSession) => {
  // Tìm brand mặc định (bao gồm cả slug có "j")
  let uncategorized = await BrandModel.findOne({ 
    $or: [
      { slug: 'khong-xac-djinh' },
      { slug: 'khong-xac-dinh' },
      { slug: 'danh-muc-mac-dinh' }
    ]
  }).sort({ slug: 1 }).session(session || null)
  
  if (!uncategorized) {
    // Tạo mới nếu không tồn tại
    const createData = {
      name: 'Không xác định',
      isPublic: true,
      isDeleted: false
    }
    
    uncategorized = session 
      ? (await BrandModel.create([createData], { session }))[0]
      : await BrandModel.create(createData)
  } else if (uncategorized.isDeleted) {
    // Khôi phục nếu đã bị xóa
    uncategorized = await BrandModel.findByIdAndUpdate(
      uncategorized._id,
      { isDeleted: false, $unset: { deletedAt: 1 } },
      { new: true, session }
    )
  }
  
  return uncategorized
}

const handleCreateBrand = async (payload: IBrand) => {
  // Kiểm tra trùng tên
  const existedName = await BrandModel.findOne({ 
    name: payload.name, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  })
  if (existedName) {
    throw new ApiError(StatusCodes.CONFLICT, `Tên thương hiệu ${payload.name} đã tồn tại.`)
  }

  // Nếu không có slug hoặc slug rỗng, để pre-save hook tự động tạo
  const createData = payload.slug ? { ...payload, isDeleted: false } : { ...payload, slug: undefined, isDeleted: false }
  const newBrand = await BrandModel.create(createData)

  return newBrand.toObject()
}
const handleFetchAllBrand = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
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
  const defaultLimit = +limit || 10
  const totalItems = await BrandModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await BrandModel.find(filter)
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
const handleFetchBrandById = async (categoryId: string) => {
  isValidMongoId(categoryId)
  const category = await BrandModel.findOne({ 
    _id: categoryId, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).lean().exec()
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Brand không tồn tại')
  }
  return category
}
const handleUpdateBrand = async (brandId: string, data: Partial<IBrand>) => {
  isValidMongoId(brandId)

  if (data.name) {
    const existed = await BrandModel.findOne({ 
      name: data.name, 
      _id: { $ne: brandId }, 
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
    })
    if (existed) {
      throw new ApiError(StatusCodes.CONFLICT, `Tên thương hiệu ${data.name} đã tồn tại.`)
    }
    
    // Tự động tạo slug mới từ name
    data.slug = createSlug(data.name)
  }

  const brand = await BrandModel.findByIdAndUpdate(brandId, data, {
    new: true,
    runValidators: true
  }).lean()

  if (!brand) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Brand không tồn tại')
  }

  return brand
}

const handleDeleteBrand = async (brandId: string): Promise<any> => {
  isValidMongoId(brandId)
  
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    // 1. Kiểm tra thương hiệu tồn tại
    const brand = await BrandModel.findById(brandId).session(session)
    if (!brand) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Thương hiệu không tồn tại')
    }
    
    // 2. Tìm hoặc tạo thương hiệu "Không xác định"
    const uncategorized = await getOrCreateUncategorizedBrand(session)
    
    // 3. Chuyển tất cả sản phẩm thuộc thương hiệu bị xóa sang thương hiệu "Không xác định"
    await ProductModel.updateMany(
      { 
        brandId: brandId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
      },
      { brandId: uncategorized._id },
      { session }
    )
    
    // 4. Soft delete thương hiệu
    const deletedBrand = await BrandModel.findByIdAndUpdate(
      brandId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true, session }
    )
    
    await session.commitTransaction()
    session.endSession()
    
    return deletedBrand
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

const handleGetAllBrands = async () => {
  const brands = await BrandModel.find({ 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).select('_id name slug').lean().exec()
  return brands
}

const handleGetBrandWithProducts = async (brandId: string, { currentPage = 1, limit = 10 }: { currentPage?: number; limit?: number }) => {
  isValidMongoId(brandId)
  
  const brand = await BrandModel.findOne({ 
    _id: brandId, 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).lean().exec()
  
  if (!brand) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Thương hiệu không tồn tại')
  }
  
  const offset = (currentPage - 1) * limit
  const filter = { 
    brandId: brandId,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
  }
  
  const totalProducts = await ProductModel.countDocuments(filter)
  const products = await ProductModel.find(filter)
    .populate('categoryId', 'name slug')
    .select('name slug price image stock capacity')
    .skip(offset)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean()
    .exec()
  
  return {
    brand,
    products: {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: Math.ceil(totalProducts / limit),
        total: totalProducts
      },
      results: products
    }
  }
}

const handleFetchTrashBrands = async ({ currentPage, limit, qs }: { currentPage: number; limit: number; qs: string }) => {
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

  const totalItems = await BrandModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await BrandModel.find(filter)
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

const handleRestoreBrand = async (brandId: string): Promise<any> => {
  isValidMongoId(brandId)

  const restored = await BrandModel.findByIdAndUpdate(
    brandId,
    { isDeleted: false, $unset: { deletedAt: 1 } },
    { new: true }
  )
  if (!restored) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy thương hiệu để khôi phục!')
  }

  return restored
}

const handleForceDeleteBrand = async (brandId: string): Promise<any> => {
  isValidMongoId(brandId)
  
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    // 1. Kiểm tra thương hiệu tồn tại
    const brand = await BrandModel.findById(brandId).session(session)
    if (!brand) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy thương hiệu để xóa!')
    }
    
    // 2. Tìm hoặc tạo thương hiệu "Không xác định"
    const uncategorized = await getOrCreateUncategorizedBrand(session)
    
    // 3. Chuyển tất cả sản phẩm thuộc thương hiệu bị xóa sang thương hiệu "Không xác định"
    await ProductModel.updateMany(
      { brandId: brandId },
      { brandId: uncategorized._id },
      { session }
    )
    
    // 4. Xóa vĩnh viễn thương hiệu
    const deleted = await BrandModel.findByIdAndDelete(brandId).session(session)
    
    await session.commitTransaction()
    session.endSession()
    
    return deleted
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

export const brandService = {
  handleCreateBrand,
  handleDeleteBrand,
  handleFetchBrandById,
  handleFetchAllBrand,
  handleUpdateBrand,
  handleGetAllBrands,
  handleGetBrandWithProducts,
  handleFetchTrashBrands,
  handleRestoreBrand,
  handleForceDeleteBrand
}
