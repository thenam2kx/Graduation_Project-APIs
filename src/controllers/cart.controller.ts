import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { CartService } from '~/services/cart.service'
import ApiError from '~/utils/ApiError'
import sendApiResponse from '~/utils/response.message'

const createCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CartService.handleCreateCart(req.body)

    sendApiResponse(res, StatusCodes.CREATED, {
      statusCode: StatusCodes.CREATED,
      message: 'Tạo giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi tạo giỏ hàng'))
  }
}

const fetchAllCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { current, pageSize, qs } = req.query
    const currentPage = typeof current === 'string' ? parseInt(current, 10) : 1
    const limit = typeof pageSize === 'string' ? parseInt(pageSize, 10) : 10

    const queryString =
      typeof qs === 'string'
        ? qs
        : Array.isArray(qs)? qs.join(',') : typeof qs === 'object' && qs !== null ? JSON.stringify(qs) : ''
    const result = await CartService.handleFetchAllCart({
      currentPage,
      limit,
      qs: queryString
    })

    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Lấy danh sách giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        error instanceof Error ? error.message : 'Lỗi lấy danh sách giỏ hàng'
      )
    )
  }
}

const fetchInfoCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cartId } = req.params
    const result = await CartService.handleFetchCartInfo(cartId)

    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Lấy thông tin giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        error instanceof Error ? error.message : 'Lỗi lấy thông tin giỏ hàng'
      )
    )
  }
}

const updateCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cartId } = req.params
    const result = await CartService.handleUpdateCart(cartId, req.body)

    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Cập nhật giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi cập nhật giỏ hàng')
    )
  }
}

const deleteCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cartId } = req.params
    const result = await CartService.handleDeleteCart(cartId)

    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Xóa giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error instanceof Error ? error.message : 'Lỗi xoá giỏ hàng'))
  }
}

export const CartController = {
  createCart,
  fetchAllCart,
  fetchInfoCart,
  updateCart,
  deleteCart
}
