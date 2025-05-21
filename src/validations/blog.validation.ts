import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import ApiError from '~/utils/ApiError'

// Tái sử dụng objectId cho MongoDB
const objectIdSchema = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'ID phải là ObjectId hợp lệ',
    'any.required': 'ID là bắt buộc'
  })

const createBlogValidation = async (req: Request, res: Response, next: NextFunction) => {
  const createBlogSchema = Joi.object({
    title: Joi.string().required().min(3).max(255).trim().messages({
      'string.empty': 'Tiêu đề không được để trống',
      'any.required': 'Tiêu đề là trường bắt buộc'
    }),
    slug: Joi.string().required().trim().messages({
      'string.empty': 'Slug không được để trống',
      'any.required': 'Slug là trường bắt buộc'
    }),
    content: Joi.string().required().trim().messages({
      'string.empty': 'Nội dung không được để trống',
      'any.required': 'Nội dung là trường bắt buộc'
    }),
    image: Joi.string().optional().uri().messages({
      'string.uri': 'Hình ảnh phải là một URL hợp lệ'
    }),
    categoryBlogId: objectIdSchema.label('categoryBlogId')
  })
  try {
    await createBlogSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const fetchAllBlogValidation = async (req: Request, res: Response, next: NextFunction) => {
  const fetchAllBlogSchema = Joi.object({
    current: Joi.number().optional().default(1).min(1),
    pageSize: Joi.number().optional().default(10).min(1).max(100),
    qs: Joi.string().optional()
  })
  try {
    await fetchAllBlogSchema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const fetchInfoBlogValidation = async (req: Request, res: Response, next: NextFunction) => {
  const fetchInfoBlogSchema = Joi.object({
    blogId: objectIdSchema.label('blogId')
  })
  try {
    await fetchInfoBlogSchema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const updateBlogValidation = async (req: Request, res: Response, next: NextFunction) => {
  const updateBlogSchema = Joi.object({
    title: Joi.string().optional().min(3).max(255).trim(),
    slug: Joi.string().optional().trim(),
    content: Joi.string().optional().trim(),
    image: Joi.string().optional().uri().messages({
      'string.uri': 'Hình ảnh phải là một URL hợp lệ'
    }),
    categoryBlogId: objectIdSchema.optional().label('categoryBlogId'),
    isPublic: Joi.forbidden().messages({
      'any.unknown': 'isPublic không được phép cập nhật qua endpoint này'
    })
  })
  try {
    await updateBlogSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const updateBlogStatusValidation = async (req: Request, res: Response, next: NextFunction) => {
  const paramsSchema = Joi.object({
    blogId: objectIdSchema.label('blogId')
  })
  const bodySchema = Joi.object({
    isPublic: Joi.boolean().required().messages({
      'any.required': 'isPublic là trường bắt buộc',
      'boolean.base': 'isPublic phải là boolean'
    })
  }).unknown(true) // Cho phép các key ngoài schema

  try {
    await paramsSchema.validateAsync(req.params, { abortEarly: false })
    await bodySchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const deleteBlogValidation = async (req: Request, res: Response, next: NextFunction) => {
  const deleteBlogSchema = Joi.object({
    blogId: objectIdSchema.label('blogId')
  })
  try {
    await deleteBlogSchema.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const fetchBlogByCategoryValidation = async (req: Request, res: Response, next: NextFunction) => {
  const paramsSchema = Joi.object({
    categoryId: objectIdSchema.label('categoryId')
  })
  const querySchema = Joi.object({
    current: Joi.number().optional().default(1).min(1),
    pageSize: Joi.number().optional().default(10).min(1).max(100),
    qs: Joi.string().optional()
  })
  try {
    await paramsSchema.validateAsync(req.params, { abortEarly: false })
    await querySchema.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xử lý'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

export const blogValidation = {
  createBlogValidation,
  fetchAllBlogValidation,
  fetchInfoBlogValidation,
  updateBlogValidation,
  updateBlogStatusValidation,
  deleteBlogValidation,
  fetchBlogByCategoryValidation
}
