/* eslint-disable @typescript-eslint/no-explicit-any */
import CategoryModel, { ICategory } from '~/models/category.model'
import { isExistObject, isValidMongoId } from '~/utils/utils'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleCreateCategory = async (data: ICategory) => {
  await isExistObject(CategoryModel, { slug: data.slug }, { checkExisted: true, errorMessage: 'Slug đã tồn tại' })
  const result = await CategoryModel.create(data)
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
  const { filter, sort, population } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10

  const totalItems = await CategoryModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await CategoryModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
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
