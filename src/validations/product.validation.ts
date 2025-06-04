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

  email: Joi.string().email().optional().trim()
})

const createProductValidation = async (req: Request, res: Response, next: NextFunction) => {
  const productValidationSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(255).messages({
      'string.base': 'Tên sản phẩm phải là chuỗi',
      'string.empty': 'Tên sản phẩm không được để trống',
      'any.required': 'Tên sản phẩm là trường bắt buộc',
      'string.min': 'Tên sản phẩm tối thiểu 2 ký tự',
      'string.max': 'Tên sản phẩm tối đa 255 ký tự'
    }),
    slug: Joi.string()
      .required()
      .trim()
      .min(3)
      .max(255)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .messages({
        'string.empty': 'Slug không được để trống',
        'any.required': 'Slug là trường bắt buộc',
        'string.pattern.base': 'Slug không hợp lệ (chỉ chữ thường, số và dấu gạch ngang)'
      }),
    price: Joi.number().required().min(0).messages({
      'number.base': 'Giá sản phẩm phải là số',
      'number.min': 'Giá sản phẩm không được nhỏ hơn 0',
      'any.required': 'Giá sản phẩm là trường bắt buộc'
    }),
    description: Joi.string().optional().allow('').trim(),
    categoryId: Joi.string()
      .optional()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'categoryId phải là ObjectId hợp lệ'
      }),
    brandId: Joi.string()
      .optional()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'brandId phải là ObjectId hợp lệ'
      }),
    image: Joi.string().optional().uri().messages({
      'string.uri': 'image phải là URL hợp lệ'
    }),
    stock: Joi.number().optional().min(0).messages({
      'number.base': 'stock phải là số',
      'number.min': 'stock không được nhỏ hơn 0'
    }),
    capacity: Joi.number().required().min(0).messages({
      'number.base': 'Dung tích sản phẩm phải là số',
      'number.min': 'Dung tích sản phẩm không được nhỏ hơn 0',
      'any.required': 'Dung tích sản phẩm là trường bắt buộc'
    }),
    discountId: Joi.string()
      .optional()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'discountId phải là ObjectId hợp lệ'
      }),
    createdBy: metaDataRefSchema.optional(),
    updatedBy: metaDataRefSchema.optional(),
    deletedBy: metaDataRefSchema.optional()
  })

  try {
    await productValidationSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const fetchAllProductValidation = async (req: Request, res: Response, next: NextFunction) => {
  const fetchAllProductValidationSchema = Joi.object({
    current: Joi.number().optional().default(1).min(1),
    pageSize: Joi.number().optional().default(10).min(1).max(100),
    qs: Joi.string().optional()
  })
  try {
    await fetchAllProductValidationSchema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const fetchInfoProductValidation = async (req: Request, res: Response, next: NextFunction) => {
  const fetchInfoProductValidationSchema = Joi.object({
    productId: Joi.string()
      .required()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('productId phải là một MongoDB ObjectId hợp lệ')
  })
  try {
    await fetchInfoProductValidationSchema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const updateProductValidation = async (req: Request, res: Response, next: NextFunction) => {
  const productValidationSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(255).messages({
      'string.base': 'Tên sản phẩm phải là chuỗi',
      'string.empty': 'Tên sản phẩm không được để trống',
      'any.required': 'Tên sản phẩm là trường bắt buộc',
      'string.min': 'Tên sản phẩm tối thiểu 2 ký tự',
      'string.max': 'Tên sản phẩm tối đa 255 ký tự'
    }),
    slug: Joi.string()
      .required()
      .trim()
      .min(3)
      .max(255)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .messages({
        'string.empty': 'Slug không được để trống',
        'any.required': 'Slug là trường bắt buộc',
        'string.pattern.base': 'Slug không hợp lệ (chỉ chữ thường, số và dấu gạch ngang)'
      }),
    price: Joi.number().required().min(0).messages({
      'number.base': 'Giá sản phẩm phải là số',
      'number.min': 'Giá sản phẩm không được nhỏ hơn 0',
      'any.required': 'Giá sản phẩm là trường bắt buộc'
    }),
    description: Joi.string().optional().allow('').trim(),
    categoryId: Joi.string()
      .optional()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'categoryId phải là ObjectId hợp lệ'
      }),
    brandId: Joi.string()
      .optional()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'brandId phải là ObjectId hợp lệ'
      }),
    image: Joi.string().optional().uri().messages({
      'string.uri': 'image phải là URL hợp lệ'
    }),
    stock: Joi.number().optional().min(0).messages({
      'number.base': 'stock phải là số',
      'number.min': 'stock không được nhỏ hơn 0'
    }),
    capacity: Joi.number().required().min(0).messages({
      'number.base': 'Dung tích sản phẩm phải là số',
      'number.min': 'Dung tích sản phẩm không được nhỏ hơn 0',
      'any.required': 'Dung tích sản phẩm là trường bắt buộc'
    }),
    discountId: Joi.string()
      .optional()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'discountId phải là ObjectId hợp lệ'
      }),
    createdBy: metaDataRefSchema.optional(),
    updatedBy: metaDataRefSchema.optional(),
    deletedBy: metaDataRefSchema.optional()
  })

  try {
    await productValidationSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const deleteProductValidation = async (req: Request, res: Response, next: NextFunction) => {
  const deleteProductValidationSchema = Joi.object({
    productId: Joi.string()
      .required()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .message('productId phải là một MongoDB ObjectId hợp lệ')
  })
  try {
    await deleteProductValidationSchema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

export const productValidation = {
  createProductValidation,
  fetchAllProductValidation,
  fetchInfoProductValidation,
  updateProductValidation,
  deleteProductValidation
}
