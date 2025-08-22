import express from 'express'
import { verifyToken } from '~/middlewares/verifyToken'
import { checkPermissions } from '~/middlewares/checkPermissions'

const router = express.Router()

// Serve soft delete management page
router.get('/soft-delete-manager', verifyToken, checkPermissions(['admin']), (req, res) => {
  res.render('admin-soft-delete', {
    title: 'Quản lý Xóa Mềm',
    user: req.user
  })
})

// API endpoint to get soft delete stats
router.get('/soft-delete-stats', verifyToken, checkPermissions(['admin']), async (req, res) => {
  try {
    // This would typically fetch stats from your models
    const stats = {
      products: 0,
      users: 0,
      categories: 0,
      brands: 0,
      blogs: 0,
      contacts: 0,
      reviews: 0,
      wishlists: 0
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    })
  }
})

export default router