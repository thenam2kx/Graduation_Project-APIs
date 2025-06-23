import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/order.service'
import ApiError from '~/utils/ApiError'
import sendApiResponse from '~/utils/response.message'

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.handleCreateOrder(req.body)
    if (result) {
      sendApiResponse(res, StatusCodes.CREATED, {
        statusCode: StatusCodes.CREATED,
        message: 'Tạo đơn hàng thành công',
        data: result
      })
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Có lỗi xảy ra trong quá trình tạo đơn hàng')
    }
  } catch (error) {
    const err = error as ErrorWithStatus
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const statusCode = err.statusCode ?? StatusCodes.UNPROCESSABLE_ENTITY
    const customError = new ApiError(statusCode, errorMessage)
    next(customError)
  }
}

const fetchAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.handleFetchAllOrders(req.params.userId)
    if (result) {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Lấy danh sách đơn hàng thành công',
        data: result
      })
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Có lỗi xảy ra trong quá trình lấy danh sách đơn hàng')
    }
  } catch (error) {
    const err = error as ErrorWithStatus
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const statusCode = err.statusCode ?? StatusCodes.UNPROCESSABLE_ENTITY
    const customError = new ApiError(statusCode, errorMessage)
    next(customError)
  }
}

const fetchOrderInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.handleFetchOrder(req.params.orderId)
    if (result) {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Lấy thông tin đơn hàng thành công',
        data: result
      })
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Có lỗi xảy ra trong quá trình lấy thông tin đơn hàng')
    }
  } catch (error) {
    const err = error as ErrorWithStatus
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const statusCode = err.statusCode ?? StatusCodes.UNPROCESSABLE_ENTITY
    const customError = new ApiError(statusCode, errorMessage)
    next(customError)
  }
}

const updateStatusOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params
    const { status } = req.body
    const result = await orderService.handleUpdateStatusOrder(orderId, status)
    if (result) {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Cập nhật trạng thái đơn hàng thành công',
        data: result
      })
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Có lỗi xảy ra trong quá trình cập nhật trạng thái đơn hàng')
    }
  } catch (error) {
    const err = error as ErrorWithStatus
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const statusCode = err.statusCode ?? StatusCodes.UNPROCESSABLE_ENTITY
    const customError = new ApiError(statusCode, errorMessage)
    next(customError)
  }
}

const fetchItemOfOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params
    const result = await orderService.handleFetchItemOfOrder(orderId)
    if (result) {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Lấy sản phẩm trong đơn hàng thành công',
        data: result
      })
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Có lỗi xảy ra trong quá trình lấy sản phẩm trong đơn hàng')
    }
  } catch (error) {
    const err = error as ErrorWithStatus
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const statusCode = err.statusCode ?? StatusCodes.UNPROCESSABLE_ENTITY
    const customError = new ApiError(statusCode, errorMessage)
    next(customError)
  }
}

const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params
    const result = await orderService.handleCancelOrder(orderId)
    if (result) {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Hủy đơn hàng thành công',
        data: result
      })
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Có lỗi xảy ra trong quá trình hủy đơn hàng')
    }
  } catch (error) {
    const err = error as ErrorWithStatus
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const statusCode = err.statusCode ?? StatusCodes.UNPROCESSABLE_ENTITY
    const customError = new ApiError(statusCode, errorMessage)
    next(customError)
  }
}

export const orderController = {
  createOrder,
  fetchOrderInfo,
  updateStatusOrder,
  fetchAllOrders,
  fetchItemOfOrder,
  cancelOrder
}
