import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/user.service'
import ApiError from '~/utils/ApiError'
import sendApiResponse from '~/utils/response.message'

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.handleCreateUser(req.body)
    if (result === null) {
      sendApiResponse(res, StatusCodes.BAD_REQUEST, {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'User already exists',
        error: {
          code: StatusCodes.BAD_REQUEST,
          details: 'The user with the provided email already exists.'
        }
      })
    } else {
      sendApiResponse(res, StatusCodes.CREATED, {
        statusCode: StatusCodes.CREATED,
        message: 'Create user success',
        data: result
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

export const userController = {
  createUser
}
