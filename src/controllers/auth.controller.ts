import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { authService } from '~/services/auth.service'
import ApiError from '~/utils/ApiError'
import sendApiResponse from '~/utils/response.message'

export interface IAuth {
  email: string
  password: string
}

const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.handleSignup(req.body as IAuth)
    if (!result) {
      sendApiResponse(res, StatusCodes.BAD_REQUEST, {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Có lỗi xảy ra trong quá trình đăng ký',
        error: {
          code: StatusCodes.BAD_REQUEST,
          details: 'Có lỗi xảy ra trong quá trình đăng ký'
        }
      })
    } else {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Đăng ký thành công',
        data: result
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email: string = req.query.email as string
    const code: string = req.body.code
    const result = await authService.handleVerifyEmail({ email, code })
    if (!result) {
      sendApiResponse(res, StatusCodes.BAD_REQUEST, {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Có lỗi xảy ra trong quá trình xác thực email',
        error: {
          code: StatusCodes.BAD_REQUEST,
          details: 'Có lỗi xảy ra trong quá trình xác thực email'
        }
      })
    } else {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Xác thực email thành công',
        data: result
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const reSendCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email: string = req.query.email as string
    const result = await authService.handleReSendCode(email)
    if (!result) {
      sendApiResponse(res, StatusCodes.BAD_REQUEST, {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Có lỗi xảy ra trong quá trình gửi lại mã xác thực',
        error: {
          code: StatusCodes.BAD_REQUEST,
          details: 'Có lỗi xảy ra trong quá trình gửi lại mã xác thực'
        }
      })
    } else {
      sendApiResponse(res, StatusCodes.OK, {
        statusCode: StatusCodes.OK,
        message: 'Gửi lại mã xác thực thành công',
        data: result
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const signin = async (req: Request, res: Response, next: NextFunction) => {
  const data: IAuth = req.body as IAuth
  try {
    const result = await authService.handleSignin(data, res)
    sendApiResponse(res, StatusCodes.OK, {
      statusCode: StatusCodes.OK,
      message: 'Đăng nhập thành công',
      data: result
    })
  } catch (error) {
    // sendApiResponse(res, StatusCodes.UNAUTHORIZED, {
    //   statusCode: StatusCodes.UNAUTHORIZED,
    //   message: 'Đăng nhập thất bại',
    //   error: {
    //     code: StatusCodes.UNAUTHORIZED,
    //     details: error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình đăng nhập'
    //   }
    // })
    const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình thực hiện'
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

const signout = async (req: Request, res: Response) => {
  res.clearCookie('refresh_token')
  sendApiResponse(res, StatusCodes.OK, {
    statusCode: StatusCodes.OK,
    message: 'Đăng xuất thành công'
  })
}

export const authController = {
  signup,
  verifyEmail,
  reSendCode,
  signin,
  signout
}
