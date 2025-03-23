import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/user.service'
import ApiError from '~/utils/ApiError'

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.handleCreateUser(req.body)
    if (result === null) {
      res.status(StatusCodes.BAD_REQUEST).json({
        EC: StatusCodes.BAD_REQUEST,
        EM: 'User already exists'
      })
    } else {
      res.status(StatusCodes.CREATED).json({
        EC: StatusCodes.CREATED,
        EM: 'Create user success',
        DT: result
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
