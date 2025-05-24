import BrandModel, { IBrand } from "~/models/BrandModel";
import { isExistObject, isValidMongoId } from "~/utils/utils";
import aqp from 'api-query-params'
import ApiError from "~/utils/ApiError";
import { StatusCodes } from "http-status-codes";
const handleCreateCategory = async ( data: IBrand ) => {
  await isExistObject(BrandModel, { slug: data.slug }, { checkExisted: true, errorMessage: 'Slug đã tồn tại' })
  const result = await BrandModel.create(data)
  return result.toObject()
}
const handleFetchAllBrand = async ({
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

  const totalItems = await BrandModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await BrandModel.find(filter)
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
const handleFetchBrandById = async (categoryId: string) => {
  isValidMongoId(categoryId)
  const category = await BrandModel.findById(categoryId).lean().exec()
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Brand không tồn tại')
  }
  return category
}
const handleUpdateBrand = async (categoryId: string, data: Partial<IBrand>) => {
  isValidMongoId(categoryId)
  const category = await BrandModel.findByIdAndUpdate(categoryId, data, {
    new: true,
    runValidators: true
  }).lean()
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Brand không tồn tại')
  }
  return category
}
const handleDeleteBrand = async (categoryId: string): Promise<any> => {
  isValidMongoId(categoryId)
  const category = await BrandModel.findByIdAndDelete(categoryId)
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Brand không tồn tại')
  }
  return category
}
export const brandService = {
  handleCreateCategory,
  handleDeleteBrand,
  handleFetchBrandById,
  handleFetchAllBrand,
  handleUpdateBrand
}