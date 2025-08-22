/* eslint-disable @typescript-eslint/no-explicit-any */
import BrandModel, { IBrand } from '~/models/brand.model'
import { createSlug, isExistObject, isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

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

const handleDeleteBrand = async (categoryId: string): Promise<any> => {
  isValidMongoId(categoryId)
  const category = await BrandModel.findByIdAndUpdate(
    categoryId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  )
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Brand không tồn tại')
  }
  return category
}

const handleGetAllBrands = async () => {
  const brands = await BrandModel.find({ 
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
  }).select('_id name slug').lean().exec()
  return brands
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

  const deleted = await BrandModel.findByIdAndDelete(brandId)
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy thương hiệu để xóa!')
  }

  return deleted
}

export const brandService = {
  handleCreateBrand,
  handleDeleteBrand,
  handleFetchBrandById,
  handleFetchAllBrand,
  handleUpdateBrand,
  handleGetAllBrands,
  handleFetchTrashBrands,
  handleRestoreBrand,
  handleForceDeleteBrand
}
