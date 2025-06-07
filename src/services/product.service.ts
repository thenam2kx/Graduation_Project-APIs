/* eslint-disable @typescript-eslint/no-explicit-any */
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import ProductModel, { IProduct } from '~/models/product.model'
import { isExistObject, isValidMongoId } from '~/utils/utils'
import '../models/category.model'
import '../models/brand.model'

const handleCreateProduct = async (data: IProduct) => {
  await isExistObject(
    ProductModel,
    { slug: data.slug },
    {
      checkExisted: true,
      errorMessage: 'Sản phẩm đã tồn tại!'
    }
  )

  const result = await ProductModel.create(data)

  return result.toObject()
}

const handleFetchAllProduct = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
  const { filter, sort } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10

  const totalItems = await ProductModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await ProductModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
    .populate({ path: 'categoryId', model: 'Category', select: 'name' })
    .populate({ path: 'brandId', model: 'Brand', select: 'name' })
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

const handleFetchInfoProduct = async (productId: string) => {
  isValidMongoId(productId)

  const product = await ProductModel.findById(productId)
    .populate({ path: 'categoryId', model: 'Category', select: 'name' })
    .populate({ path: 'brandId', model: 'Brand', select: 'name' })
    .lean()
    .exec()

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại!')
  }

  return product
}

const handleUpdateProduct = async (productId: string, data: Partial<IProduct>) => {
  isValidMongoId(productId)

  const updated = await ProductModel.updateOne({ _id: productId }, data)
  if (updated.modifiedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để cập nhật!')
  }

  return updated
}

const handleDeleteProduct = async (productId: string): Promise<any> => {
  isValidMongoId(productId)

  const deleted = await ProductModel.deleteById(productId)
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để xóa!')
  }

  return deleted
}

export const productService = {
  handleCreateProduct,
  handleFetchAllProduct,
  handleFetchInfoProduct,
  handleUpdateProduct,
  handleDeleteProduct
}
