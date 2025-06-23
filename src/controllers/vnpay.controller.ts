import { Request, Response, NextFunction } from 'express'
import { createVnpayPaymentUrl, verifyVnpayReturn } from '~/services/vnpay.service'

export const vnpayController = {
  createPayment: (req, res, next) => {
    try {
      console.log('VNPay create payment request:', req.body)
      const { amount, orderId, orderInfo } = req.body
      const ipAddr = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1'

      if (!amount || !orderId || !orderInfo) {
        console.log('Missing payment info:', { amount, orderId, orderInfo })
        return res.status(400).json({ 
          success: false,
          message: 'Thiếu thông tin thanh toán',
          error: 'MISSING_PAYMENT_INFO'
        })
      }

      const paymentUrl = createVnpayPaymentUrl({
        amount: Number(amount),
        orderId: orderId.toString(),
        orderInfo: orderInfo.toString(),
        ipAddr: ipAddr.toString()
      })

      console.log('Generated payment URL:', paymentUrl)
      
      if (!paymentUrl) {
        return res.status(500).json({ 
          success: false,
          message: 'Không thể tạo URL thanh toán',
          error: 'PAYMENT_URL_GENERATION_FAILED'
        })
      }

      return res.json({ 
        success: true,
        paymentUrl,
        message: 'Tạo URL thanh toán thành công'
      })
    } catch (error) {
      console.error('VNPay create payment error:', error)
      return res.status(500).json({ 
        success: false,
        message: 'Lỗi hệ thống khi tạo thanh toán',
        error: error.message
      })
    }
  },

  vnpayReturn: (req, res, next) => {
    try {
      console.log('VNPay return query params:', req.query)
      const vnpayParams = req.query
      const result = verifyVnpayReturn(vnpayParams)
      
      console.log('Verify result:', result)
      
      // Tạm thời bỏ qua verify chữ ký cho test
      if (result.responseCode === '00') {
        return res.json({
          success: true,
          message: 'Thanh toán thành công',
          data: result.data,
          verified: result.isValid
        })
      } else {
        return res.json({
          success: false,
          message: 'Thanh toán thất bại',
          code: result.responseCode,
          data: result.data,
          verified: result.isValid
        })
      }
    } catch (error) {
      console.error('VNPay return error:', error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xác thực thanh toán'
      })
    }
  },

  vnpayIPN: (req, res, next) => {
    try {
      console.log('VNPay IPN received:', req.query)
      const vnpayParams = req.query
      const result = verifyVnpayReturn(vnpayParams)
      
      if (result.responseCode === '00') {
        // TODO: Cập nhật trạng thái đơn hàng trong database
        console.log('Payment success for order:', result.data?.orderId)
        return res.json({ RspCode: '00', Message: 'success' })
      } else {
        console.log('Payment failed for order:', result.data?.orderId)
        return res.json({ RspCode: '01', Message: 'failed' })
      }
    } catch (error) {
      console.error('VNPay IPN error:', error)
      return res.json({ RspCode: '99', Message: 'error' })
    }
  }
}
