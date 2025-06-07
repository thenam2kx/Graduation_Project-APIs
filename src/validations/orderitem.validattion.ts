import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import ApiError from '~/utils/ApiError'

const createOrderItemValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    orderId: Joi.string().trim().length(24).required().label('orderId').messages({
      'string.base': 'orderId phải là chuỗi',
      'string.length': 'orderId phải có độ dài 24 ký tự',
      'string.hex': 'orderId phải là chuỗi hex hợp lệ',
      'any.required': 'orderId là trường bắt buộc'
    }),
    productId: Joi.string().trim().length(24).hex().required().label('productId').messages({
      'string.base': 'productId phải là chuỗi',
      'string.length': 'productId phải có độ dài 24 ký tự',
      'string.hex': 'productId phải là chuỗi hex hợp lệ',
      'any.required': 'productId là trường bắt buộc'
    }),
    variantId: Joi.string().trim().length(24).optional().messages({
    'string.base': 'variantId phải là chuỗi',
    'string.length': 'variantId phải có độ dài 24 ký tự',
    'string.hex': 'variantId phải là chuỗi hex hợp lệ'
  }),
    quantity: Joi.number().required().min(1).messages({
      'number.base': 'quantity phải là số',
      'number.min': 'Số lượng phải lớn hơn 0',
      'any.required': 'quantity là trường bắt buộc'
    }),
    price: Joi.number().required().min(0).messages({
      'number.base': 'price phải là số',
      'number.min': 'Giá phải lớn hơn hoặc bằng 0',
      'any.required': 'price là trường bắt buộc'
    })
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Dữ liệu không hợp lệ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const fetchAllOrderItemValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    current: Joi.number().optional().default(1).min(1),
    pageSize: Joi.number().optional().default(10).min(1).max(100),
    qs: Joi.string().optional()
  })

  try {
    await schema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Dữ liệu không hợp lệ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const fetchInfoOrderItemValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    orderItemId: Joi.string().trim().length(24).hex().required().label('orderItemId').messages({
      'string.base': 'orderItemId phải là chuỗi',
      'string.length': 'orderItemId phải có độ dài 24 ký tự',
      'string.hex': 'orderItemId phải là chuỗi hex hợp lệ',
      'any.required': 'orderItemId là trường bắt buộc'
    })
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Dữ liệu không hợp lệ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const updateOrderItemValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    quantity: Joi.number().optional().min(1).messages({
      'number.base': 'quantity phải là số',
      'number.min': 'Số lượng phải lớn hơn 0'
    }),
    price: Joi.number().optional().min(0).messages({
      'number.base': 'price phải là số',
      'number.min': 'Giá phải lớn hơn hoặc bằng 0'
    })
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Dữ liệu không hợp lệ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

const deleteOrderItemValidation = async (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    orderItemId: Joi.string().trim().length(24).hex().required().label('orderItemId').messages({
      'string.base': 'orderItemId phải là chuỗi',
      'string.length': 'orderItemId phải có độ dài 24 ký tự',
      'string.hex': 'orderItemId phải là chuỗi hex hợp lệ',
      'any.required': 'orderItemId là trường bắt buộc'
    })
  })

  try {
    await schema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Dữ liệu không hợp lệ'
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage))
  }
}

export const orderItemValidation = {
  createOrderItemValidation,
  fetchAllOrderItemValidation,
  fetchInfoOrderItemValidation,
  updateOrderItemValidation,
  deleteOrderItemValidation
}
