import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import ApiError from '~/utils/ApiError'

const createCartValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string().trim().length(24).hex().required().label('userId').messages({
      'string.base': 'userId phải là chuỗi',
      'string.length': 'userId phải có độ dài 24 ký tự',
      'string.hex': 'userId phải là chuỗi hex hợp lệ',
      'any.required': 'userId là trường bắt buộc'
    })
  })
  try {
    await schema.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi khi tạo cart'))
  }
}

const updateCartValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string().trim().length(24).hex().optional().label('userId').messages({
      'string.base': 'userId phải là chuỗi',
      'string.length': 'userId phải có độ dài 24 ký tự',
      'string.hex': 'userId phải là chuỗi hex hợp lệ'
    })
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false, stripUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi khi cập nhật cart'))
  }
}

const deleteCartValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    cartItemId: Joi.string().trim().length(24).hex().required().label('cartItemId').messages({
      'string.base': 'cartItemId phải là chuỗi',
      'string.length': 'cartItemId phải có độ dài 24 ký tự',
      'string.hex': 'cartItemId phải là chuỗi hex hợp lệ',
      'any.required': 'cartItemId là trường bắt buộc'
    })
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi khi xoá cart'))
  }
}

const fetchInfoCartValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    cartId: Joi.string().trim().length(24).hex().required().label('cartId').messages({
      'string.base': 'cartId phải là chuỗi',
      'string.length': 'cartId phải có độ dài 24 ký tự',
      'string.hex': 'cartId phải là chuỗi hex hợp lệ',
      'any.required': 'cartId là trường bắt buộc'
    })
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi khi lấy thông tin cart'))
  }
}

const fetchAllCartsValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string().trim().length(24).hex().required().label('userId').messages({
      'string.base': 'userId phải là chuỗi',
      'string.length': 'userId phải có độ dài 24 ký tự',
      'string.hex': 'userId phải là chuỗi hex hợp lệ',
      'any.required': 'userId là trường bắt buộc'
    }),
    current: Joi.number().integer().min(1).optional(),
    pageSize: Joi.number().integer().min(1).optional(),
    qs: Joi.alternatives().try(Joi.string(), Joi.object(), Joi.array().items(Joi.string())).optional()
  })

  try {
    await schema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi khi lấy danh sách cart')
    )
  }
}

export const cartValidation = {
  createCartValidation,
  updateCartValidation,
  deleteCartValidation,
  fetchInfoCartValidation,
  fetchAllCartsValidation
}
