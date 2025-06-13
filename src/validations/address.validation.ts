import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import ApiError from '~/utils/ApiError'

const metaDataRefSchema = Joi.object({
  _id: Joi.string()
    .required()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('ID không hợp lệ'),
  name: Joi.string().optional().trim().min(2).max(100),
  email: Joi.string().optional().email().trim()
})

const createAddressValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string()
      .required()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('userId không hợp lệ'),
    province: Joi.string().required().trim().messages({
      'any.required': 'Tỉnh/Thành là trường bắt buộc'
    }),
    district: Joi.string().required().trim().messages({
      'any.required': 'Quận/Huyện là trường bắt buộc'
    }),
    ward: Joi.string().required().trim().messages({
      'any.required': 'Phường/Xã là trường bắt buộc'
    }),
    address: Joi.string().required().trim().messages({
      'any.required': 'Địa chỉ cụ thể là trường bắt buộc'
    }),
    isPrimary: Joi.boolean().optional(),
    createdBy: metaDataRefSchema.optional(),
    updatedBy: metaDataRefSchema.optional(),
    deletedBy: metaDataRefSchema.optional()
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xác thực dữ liệu'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const fetchAllAddressValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    current: Joi.number().optional().default(1).min(1),
    pageSize: Joi.number().optional().default(10).min(1).max(100),
    qs: Joi.string().optional()
  })
  try {
    await schema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lỗi truy vấn địa chỉ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const fetchInfoAddressValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    addressId: Joi.string()
      .required()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('addressId không hợp lệ')
  })
  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi xác thực addressId'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const updateAddressValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string()
      .required()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('userId không hợp lệ'),
    province: Joi.string().optional().trim(),
    district: Joi.string().optional().trim(),
    ward: Joi.string().optional().trim(),
    address: Joi.string().optional().trim(),
    isPrimary: Joi.boolean().optional(),
    updatedBy: metaDataRefSchema.optional(),
    deletedBy: metaDataRefSchema.optional(),
    createdBy: metaDataRefSchema.forbidden()
  })
  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi cập nhật địa chỉ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const deleteAddressValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    addressId: Joi.string()
      .required()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('addressId không hợp lệ')
  })
  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lỗi khi xóa địa chỉ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

export const addressValidation = {
  createAddressValidation,
  fetchAllAddressValidation,
  fetchInfoAddressValidation,
  updateAddressValidation,
  deleteAddressValidation
}
