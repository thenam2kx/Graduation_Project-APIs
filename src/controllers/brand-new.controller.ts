import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import BrandNewModel from '~/models/brand-new.model'
import sendApiResponse from '~/utils/response.message'

const createBrandNew = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await BrandNewModel.create(req.body)
    sendApiResponse(res, StatusCodes.CREATED, {
      statusCode: StatusCodes.CREATED,
      message: 'Tạo brand mới thành công',
      data: brand
    })
  } catch (error) {
    next(error)
  }
}

const getAllBrandNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await BrandNewModel.find({}).lean()
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Lấy danh sách brand mới thành công',
      data: brands
    })
  } catch (error) {
    next(error)
  }
}

const deleteBrandNew = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const brand = await BrandNewModel.findById(id)
    
    if (!brand) {
      return sendApiResponse(res, StatusCodes.NOT_FOUND, {
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Brand mới không tồn tại'
      })
    }

    await brand.delete('admin-user')
    
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Xóa brand mới thành công'
    })
  } catch (error) {
    next(error)
  }
}

const getDeletedBrandNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedBrands = await BrandNewModel.findDeleted({}).lean()
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Lấy danh sách brand mới đã xóa thành công',
      data: deletedBrands
    })
  } catch (error) {
    next(error)
  }
}

export const brandNewController = {
  createBrandNew,
  getAllBrandNews,
  deleteBrandNew,
  getDeletedBrandNews
}