import { Request, Response, NextFunction } from 'express'
import { createVnpayPaymentUrl, verifyVnpayReturn } from '~/services/vnpay.service'

export const vnpayController = {
  createPayment: (req, res, next) => {
    try {
      const { amount, orderId, orderInfo } = req.body
      const ipAddr = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1'

      if (!amount || !orderId || !orderInfo) {
        return res.status(400).json({ message: 'Thiếu thông tin thanh toán' })
      }

      const paymentUrl = createVnpayPaymentUrl({
        amount: Number(amount),
        orderId: orderId.toString(),
        orderInfo: orderInfo.toString(),
        ipAddr: ipAddr.toString()
      })

      return res.json({ paymentUrl })
    } catch (error) {
      next(error)
    }
  },

  vnpayReturn: (req, res, next) => {
    try {
      const vnpayParams = req.query
      const result = verifyVnpayReturn(vnpayParams)
      
      if (result.isValid) {
        if (result.responseCode === '00') {
          return res.json({
            success: true,
            message: 'Thanh toán thành công',
            data: result.data
          })
        } else {
          return res.json({
            success: false,
            message: 'Thanh toán thất bại',
            code: result.responseCode
          })
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Chữ ký không hợp lệ'
        })
      }
    } catch (error) {
      next(error)
    }
  }
}
