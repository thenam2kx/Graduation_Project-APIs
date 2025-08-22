import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/order.service'
import ApiError from '~/utils/ApiError'
import sendApiResponse from '~/utils/response.message'
import OrderModel from '~/models/order.model'
import OrderItemModel from '~/models/orderItems.model'

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
    const { userId } = req.params
    const { page = 1, limit = 10, sort = '-createdAt', status } = req.query

    const result = await orderService.handleFetchAllOrders(userId, {
      page: Number(page),
      limit: Number(limit),
      sort: String(sort),
      status: status?.toString()
    })

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
        message: 'Lấy thông tin chi tiết đơn hàng thành công',
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
    const { status, reason } = req.body
    const result = await orderService.handleUpdateStatusOrder(orderId, status, reason)
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
    const { reason } = req.body
    const result = await orderService.handleCancelOrder(orderId, reason) // truyền reason vào
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

// API mới để lấy tất cả đơn hàng cho Admin với phân trang
const fetchAllOrdersForAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Fetching all orders for admin, query:', req.query)
    
    const { page = 1, limit = 10, sort = '-createdAt', status } = req.query
    
    const filter: any = {}
    if (status) filter.status = status
    
    const currentPage = Number(page)
    const pageSize = Number(limit)
    const offset = (currentPage - 1) * pageSize
    
    // Đếm tổng số đơn hàng
    const totalItems = await OrderModel.countDocuments(filter)
    const totalPages = Math.ceil(totalItems / pageSize)
    
    console.log(`Pagination: page=${currentPage}, limit=${pageSize}, total=${totalItems}`)
    
    // Lấy đơn hàng với phân trang
    const orders = await OrderModel.find(filter)
      .sort(sort as string)
      .skip(offset)
      .limit(pageSize)
      .populate('userId', 'fullName name email phone')
      .populate('addressId', 'province district ward address')
      .populate('discountId', 'name value type startDate endDate')
      .lean()
      .exec()

    console.log(`Orders found: ${orders.length}/${totalItems}`)

    // Lấy thêm thông tin các sản phẩm trong đơn hàng
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.find({ orderId: order._id })
          .populate('productId')
          .populate({
            path: 'variantId',
            populate: {
              path: 'variant_attributes',
              populate: {
                path: 'attributeId',
                select: 'name slug'
              }
            }
          })
          .lean()
          .exec()
        return { ...order, items }
      })
    )

    const result = {
      meta: {
        current: currentPage,
        pageSize: pageSize,
        pages: totalPages,
        total: totalItems
      },
      results: ordersWithItems
    }

    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Lấy danh sách đơn hàng thành công',
      data: result
    })
  } catch (error) {
    console.error('Error in fetchAllOrdersForAdmin:', error)
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
  cancelOrder,
  fetchAllOrdersForAdmin
}
