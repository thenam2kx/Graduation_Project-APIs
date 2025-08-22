/* eslint-disable @typescript-eslint/no-explicit-any */
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import AttributeModel, { IAttribute } from '~/models/attribute.model'
import { isValidMongoId, createSlug } from '~/utils/utils'

const handleCreateAttribute = async (data: IAttribute) => {
  // Kiểm tra trùng tên
  const existedName = await AttributeModel.findOne({ name: data.name })
  if (existedName) {
    throw new ApiError(StatusCodes.CONFLICT, `Tên thuộc tính ${data.name} đã tồn tại.`)
  }
  
  // Bỏ slug từ client, để pre-save hook tự động tạo
  const { slug, ...createData } = data
  const result = await AttributeModel.create(createData)
  return result.toObject()
}

const handleFetchAllAttributes = async ({
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
  
  if (qs && typeof qs === 'string' && qs.trim() !== '') {
    filter.$or = [{ name: { $regex: qs, $options: 'i' } }, { slug: { $regex: qs, $options: 'i' } }]
  } else {
    const aqpResult = aqp(qs || '')
    filter = aqpResult.filter || {}
    sort = aqpResult.sort || {}
    delete filter.current
    delete filter.pageSize
  }

  const offset = (currentPage - 1) * limit
  const defaultLimit = limit || 10

  const totalItems = await AttributeModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await AttributeModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(Object.keys(sort).length > 0 ? sort : { createdAt: -1 })
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

const handleFetchInfoAttribute = async (attributeId: string) => {
  isValidMongoId(attributeId)

  const attribute = await AttributeModel.findById(attributeId).lean().exec()

  if (!attribute) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Thuộc tính không tồn tại!')
  }

  return attribute
}

const handleUpdateAttribute = async (attributeId: string, data: Partial<IAttribute>) => {
  isValidMongoId(attributeId)

  if (data.name) {
    const existed = await AttributeModel.findOne({ name: data.name, _id: { $ne: attributeId } })
    if (existed) {
      throw new ApiError(StatusCodes.CONFLICT, `Tên thuộc tính ${data.name} đã tồn tại.`)
    }
    
    // Tự động tạo slug mới từ name
    data.slug = createSlug(data.name)
  }

  const updated = await AttributeModel.updateOne({ _id: attributeId }, data)
  if (updated.modifiedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy thuộc tính để cập nhật!')
  }

  return updated
}

const handleDeleteAttribute = async (attributeId: string): Promise<any> => {
  isValidMongoId(attributeId)

  const deleted = await AttributeModel.findByIdAndDelete(attributeId)
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy thuộc tính để xóa!')
  }

  return deleted
}

export const attributeService = {
  handleCreateAttribute,
  handleFetchAllAttributes,
  handleFetchInfoAttribute,
  handleUpdateAttribute,
  handleDeleteAttribute
}
