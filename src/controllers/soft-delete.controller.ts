import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { softDeleteService } from '~/services/soft-delete.service'
import sendApiResponse from '~/utils/response.message'
import ApiError from '~/utils/ApiError'

const getDeletedItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model } = req.params
    const { page = 1, limit = 10 } = req.query
    
    if (!model) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Model parameter is required')
    }
    
    const parsedPage = parseInt(page as string) || 1
    const parsedLimit = parseInt(limit as string) || 10
    
    const result = await softDeleteService.getDeletedItems(
      model,
      parsedPage,
      parsedLimit
    )
    
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: `Lấy danh sách ${model} đã xóa thành công`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const restoreItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model, id } = req.params
    
    const result = await softDeleteService.restoreItem(model, id)
    
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: result.message,
      data: result.item
    })
  } catch (error) {
    next(error)
  }
}

const permanentDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model, id } = req.params
    
    const result = await softDeleteService.permanentDelete(model, id)
    
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: result.message
    })
  } catch (error) {
    next(error)
  }
}

const bulkRestore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model } = req.params
    const { ids } = req.body
    
    const result = await softDeleteService.bulkRestore(model, ids)
    
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: result.message,
      data: { restoredCount: result.restoredCount }
    })
  } catch (error) {
    next(error)
  }
}

const bulkPermanentDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model } = req.params
    const { ids } = req.body
    
    const result = await softDeleteService.bulkPermanentDelete(model, ids)
    
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: result.message,
      data: { deletedCount: result.deletedCount }
    })
  } catch (error) {
    next(error)
  }
}

export const softDeleteController = {
  getDeletedItems,
  restoreItem,
  permanentDelete,
  bulkRestore,
  bulkPermanentDelete
}