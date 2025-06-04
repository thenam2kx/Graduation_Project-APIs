import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const objectIdSchema = Joi.string()
  .required()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'ID phải là ObjectId hợp lệ',
    'any.required': 'ID là trường bắt buộc'
  })

const createDiscountsValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    code: Joi.string().required().trim().messages({
      'string.empty': 'Mã giảm giá không được để trống',
      'any.required': 'Mã giảm giá là bắt buộc'
    }),
    description: Joi.string().required().messages({
      'string.empty': 'Mô tả không được để trống',
      'any.required': 'Mô tả là bắt buộc'
    }),
    type: Joi.string().valid('%', 'Vnd').required().messages({
      'any.only': 'Loại giảm giá phải là "%" hoặc "Vnd"',
      'any.required': 'Loại giảm giá là bắt buộc'
    }),
    value: Joi.number().min(0).required(),
    min_order_value: Joi.number().min(0).required(),
    max_discount_amount: Joi.number().min(0).required(),
    status: Joi.boolean().required(),
    applies_category: Joi.string().optional().allow(''),
    applies_product: Joi.string().optional().allow(''),
    applies_variant: Joi.string().optional().allow(''),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    usage_limit: Joi.number().min(0).max(100).required(),
    usage_per_user: Joi.number().min(0).max(1).required()
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xác thực dữ liệu thất bại'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))
  }
}

const fetchAllDiscountsValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    current: Joi.number().optional().default(1).min(1),
    pageSize: Joi.number().optional().default(10).min(1).max(100),
    qs: Joi.string().optional()
  })

  try {
    await schema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xác thực dữ liệu thất bại'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))
  }
}

const fetchDiscountsByIdValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    discountsID: objectIdSchema
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xác thực dữ liệu thất bại'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))
  }
}

const updateDiscountsValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    code: Joi.string().optional().trim(),
    description: Joi.string().optional(),
    type: Joi.string().valid('%', 'Vnd').optional(),
    value: Joi.number().min(0).optional(),
    min_order_value: Joi.number().min(0).optional(),
    max_discount_amount: Joi.number().min(0).optional(),
    status: Joi.boolean().optional(),
    applies_category: Joi.string().optional().allow(''),
    applies_product: Joi.string().optional().allow(''),
    applies_variant: Joi.string().optional().allow(''),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    usage_limit: Joi.number().min(0).optional(),
    usage_per_user: Joi.number().min(0).optional()
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xác thực dữ liệu thất bại'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))
  }
}

const deleteDiscountsValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    discountsID: objectIdSchema
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xác thực dữ liệu thất bại'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))
  }
}

export const discountsValidation = {
  createDiscountsValidation,
  fetchAllDiscountsValidation,
  fetchDiscountsByIdValidation,
  updateDiscountsValidation,
  deleteDiscountsValidation
}
