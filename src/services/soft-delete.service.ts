import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'
import ApiError from '~/utils/ApiError'
import logger from '~/config/logger'
import ProductModel from '~/models/product.model'
import UserModel from '~/models/user.model'
import CategoryModel from '~/models/category.model'
import BrandModel from '~/models/brand.model'
import BlogModel from '~/models/blog.model'
import CateblogModel from '~/models/blogcategory.model'
import DiscountModel from '~/models/discounts.model'
import AttributeModel from '~/models/attribute.model'
import ContactModel from '~/models/contact.model'
import WishlistModel from '~/models/wishlist.model'

const MODEL_MAP = {
  products: ProductModel,
  users: UserModel,
  categories: CategoryModel,
  brands: BrandModel,
  blogs: BlogModel,
  blogcategories: CateblogModel,
  discounts: DiscountModel,
  attributes: AttributeModel,
  contacts: ContactModel,
  wishlists: WishlistModel
}

const validateModel = (modelName: string) => {
  const Model = MODEL_MAP[modelName as keyof typeof MODEL_MAP]
  if (!Model) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Model không được hỗ trợ')
  }
  return Model
}

const getDeletedItems = async (modelName: string, page: number = 1, limit: number = 10) => {
  try {
    if (!modelName) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Model name is required')
    }

    const Model = validateModel(modelName)

    if (!Model.countDeleted || !Model.findDeleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Model ${modelName} không hỗ trợ soft delete`)
    }

    const offset = (page - 1) * limit
    const totalItems = await Model.countDeleted()
    const totalPages = Math.ceil(totalItems / limit)

    const items = await Model.findDeleted()
      .skip(offset)
      .limit(limit)
      .sort({ deletedAt: -1 })
      .lean()

    return {
      meta: {
        current: page,
        pageSize: limit,
        pages: totalPages,
        total: totalItems
      },
      results: items || []
    }
  } catch (error) {
    logger.error('Error in getDeletedItems:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Lỗi khi lấy danh sách đã xóa')
  }
}

const restoreItem = async (modelName: string, id: string) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID không hợp lệ')
    }

    const Model = validateModel(modelName)

    if (!Model.findDeleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Model ${modelName} không hỗ trợ soft delete`)
    }

    const item = await Model.findDeleted({ _id: id })
    if (!item) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy item đã xóa')
    }

    if (typeof item.restore === 'function') {
      await item.restore()
    } else {
      // Fallback: manually restore
      await Model.updateOne({ _id: id }, { $unset: { deleted: 1, deletedAt: 1 } })
    }
    
    logger.info('Item restored successfully')
    
    return { message: 'Khôi phục thành công', item: item.toObject ? item.toObject() : item }
  } catch (error) {
    logger.error('Error in restoreItem:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Lỗi khi khôi phục item')
  }
}

const permanentDelete = async (modelName: string, id: string) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID không hợp lệ')
    }

    const Model = validateModel(modelName)

    if (!Model.findDeleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Model ${modelName} không hỗ trợ soft delete`)
    }

    const item = await Model.findDeleted({ _id: id })
    if (!item) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy item đã xóa')
    }

    await Model.findByIdAndDelete(id)
    logger.info('Item permanently deleted successfully')
    
    return { message: 'Xóa vĩnh viễn thành công' }
  } catch (error) {
    logger.error('Error in permanentDelete:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Lỗi khi xóa vĩnh viễn')
  }
}

const bulkRestore = async (modelName: string, ids: string[]) => {
  try {
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id))
    if (validIds.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không có ID hợp lệ')
    }

    const Model = validateModel(modelName)

    let result
    if (Model.restore) {
      result = await Model.restore({ _id: { $in: validIds } })
    } else {
      // Fallback: manual restore
      result = await Model.updateMany(
        { _id: { $in: validIds } },
        { $unset: { deleted: 1, deletedAt: 1 } }
      )
    }
    
    const count = result.modifiedCount || result.nModified || 0
    logger.info(`Bulk restored ${count} items`)
    
    return { 
      message: `Khôi phục thành công ${count} items`,
      restoredCount: count
    }
  } catch (error) {
    logger.error('Error in bulkRestore:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Lỗi khi khôi phục hàng loạt')
  }
}

const bulkPermanentDelete = async (modelName: string, ids: string[]) => {
  try {
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id))
    if (validIds.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không có ID hợp lệ')
    }

    const Model = validateModel(modelName)

    const result = await Model.deleteMany({ _id: { $in: validIds } })
    logger.info(`Bulk permanently deleted ${result.deletedCount} items`)
    
    return { 
      message: `Xóa vĩnh viễn thành công ${result.deletedCount} items`,
      deletedCount: result.deletedCount
    }
  } catch (error) {
    logger.error('Error in bulkPermanentDelete:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Lỗi khi xóa vĩnh viễn hàng loạt')
  }
}

export const softDeleteService = {
  getDeletedItems,
  restoreItem,
  permanentDelete,
  bulkRestore,
  bulkPermanentDelete
}