import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const SUPPORTED_MODELS = [
  'products', 'users', 'categories', 'brands', 'blogs', 
  'blogcategories', 'discounts', 'attributes', 'contacts', 
  'notifications', 'reviews', 'wishlists'
]

const modelValidation = async (req: Request, res: Response, next: NextFunction) => {
  const correctCondition = Joi.object({
    model: Joi.string().valid(...SUPPORTED_MODELS).required()
  })

  try {
    await correctCondition.validateAsync(req.params)
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation error'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const idValidation = async (req: Request, res: Response, next: NextFunction) => {
  const correctCondition = Joi.object({
    model: Joi.string().valid(...SUPPORTED_MODELS).required(),
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })

  try {
    await correctCondition.validateAsync(req.params)
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation error'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const bulkValidation = async (req: Request, res: Response, next: NextFunction) => {
  const paramsCondition = Joi.object({
    model: Joi.string().valid(...SUPPORTED_MODELS).required()
  })

  const bodyCondition = Joi.object({
    ids: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).required()
  })

  try {
    await paramsCondition.validateAsync(req.params)
    await bodyCondition.validateAsync(req.body)
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation error'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

export const softDeleteValidation = {
  modelValidation,
  idValidation,
  bulkValidation
}