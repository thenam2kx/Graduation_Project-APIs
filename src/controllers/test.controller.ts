import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import TestModel from '~/models/test.model'
import sendApiResponse from '~/utils/response.message'

const testController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tests = await TestModel.find()
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Test successful',
      data: tests
    })
  } catch (error) {
    next(error)
  }
}

export { testController }