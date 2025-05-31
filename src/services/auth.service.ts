import { comparePassword } from '~/utils/utils'
import { IAuth } from '~/controllers/auth.controller'
import UserModel from '~/models/user.model'
import { sendEmail } from '~/utils/sendEmail'
import { checkExpiredCode, generateCode, hashPassword, isExistObject } from '~/utils/utils'
import { generateToken } from '~/utils/jwt'
import configEnv from '~/config/env'
import { Response } from 'express'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const handleSignup = async (data: IAuth) => {
  await isExistObject(UserModel, { email: data.email }, { checkExisted: true, errorMessage: 'Người dùng đã tồn tại' })

  const verifyCode = generateCode()

  const hashPass = await hashPassword(data.password as string)
  const result = await UserModel.create({
    ...data,
    password: hashPass,
    isVerified: false,
    role: 'user',
    verifyCode: verifyCode,
    verifyCodeExpired: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  })

  if (result) {
    sendEmail(result.email, 'Kích hoạt tài khoản', 'mailer', {
      activationCode: verifyCode,
      author: result.fullName
    })
    return 'Tạo người dùng thành công'
  } else {
    return null
  }
}

const handleVerifyEmail = async ({ email, code }: { email: string; code: string }) => {
  const res = await UserModel.findOne({ email })
  if (res) {
    if (res.isVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email đã được xác thực trước đó')
    }
    if (res.verifyCodeExpired && !checkExpiredCode(res.verifyCodeExpired.toISOString())) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã xác thực đã hết hạn, vui lòng yêu cầu mã mới')
    } else if (res.verifyCode === code) {
      res.isVerified = true
      await res.save()
      return 'Xác thực email thành công'
    }
  } else {
    return null
  }
}

const handleReSendCode = async (email: string) => {
  const verifyCode = generateCode()
  const user = await UserModel.findOne({ email })
  if (user) {
    if (user.isVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email đã được xác thực trước đó')
      // throw new Error('Email đã được xác thực trước đó')
    }
    user.verifyCode = verifyCode
    user.verifyCodeExpired = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    await user.save()
    sendEmail(email, 'Kích hoạt tài khoản', 'mailer', {
      activationCode: verifyCode,
      author: user.fullName
    })
    return 'Mã xác thực mới đã được gửi đến email của bạn'
  } else {
    return null
  }
}

const handleSignin = async (data: IAuth, response: Response) => {
  const user = await UserModel.findOne({ email: data.email })
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Người dùng không tồn tại')
  }
  if (!user.isVerified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Tài khoản chưa được kích hoạt, vui lòng kiểm tra email để kích hoạt tài khoản'
    )
  }
  const isMatch = await comparePassword(data.password as string, user.password as string)
  if (!isMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Mật khẩu không chính xác')
  }

  const token = generateToken({ _id: user._id, email: user.email, role: user.role }, configEnv.jwt.accessTokenExpires)
  const refreshToken = generateToken(
    { _id: user._id, email: user.email, role: user.role },
    configEnv.jwt.refreshTokenExpires
  )
  user.refreshToken = refreshToken
  user.refreshTokenExpired = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await user.save()

  if (!token || !refreshToken) {
    throw new Error('Có lỗi sảy ra, vui lòng thử lại sau!')
  }

  response.clearCookie('refresh_token')
  response.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: configEnv.buildMode === 'production',
    sameSite: 'strict',
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  return {
    user: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    },
    access_token: token
  }
}

const handleSignout = async (userId: string) => {
  const user = await UserModel.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Người dùng không tồn tại')
  }
  user.refreshToken = undefined
  user.refreshTokenExpired = undefined
  await user.save()
  return 'Đăng xuất thành công'
}

export const authService = {
  handleSignup,
  handleVerifyEmail,
  handleReSendCode,
  handleSignin,
  handleSignout
}
