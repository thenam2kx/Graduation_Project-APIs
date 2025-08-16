import Review from '../models/review.model'
import Product from '../models/product.model'
import OrderModel from '../models/order.model'
import OrderItemModel from '../models/orderItems.model'
import UserModel from '../models/user.model'
import ApiError from '../utils/ApiError'
import mongoose from 'mongoose'

// Business logic tách riêng
export class ReviewService {
  // Kiểm tra từ ngữ tục tĩu
  private static badWords = [
    'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'dái', 'đéo', 'đít', 'đĩ', 'đm',
    'fuck', 'shit', 'bitch', 'dick', 'pussy', 'asshole', 'cunt',
    'ngu', 'óc chó', 'súc vật', 'chó', 'lợn', 'mẹ mày', 'con mẹ', 'cmm', 'vcl'
  ]

  private static checkForBadWords(text: string): boolean {
    if (!text) return false
    const lowerText = text.toLowerCase()
    return this.badWords.some(word => lowerText.includes(word))
  }

  // Kiểm tra quyền đánh giá
  static async validateReviewPermission(userId: string, productId: string) {
    // 1. Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId)
    if (!product) throw new ApiError(404, 'Sản phẩm không tồn tại')

    // 2. Kiểm tra đã mua sản phẩm
    const orders = await OrderModel.find({ userId, status: 'completed' })
    if (orders.length === 0) {
      throw new ApiError(403, 'Bạn chỉ có thể đánh giá sản phẩm từ đơn hàng đã hoàn thành')
    }

    const orderIds = orders.map(order => order._id)
    const orderItem = await OrderItemModel.findOne({
      orderId: { $in: orderIds },
      productId: productId
    })

    if (!orderItem) {
      throw new ApiError(403, 'Sản phẩm này không có trong đơn hàng đã hoàn thành của bạn')
    }

    // 3. Kiểm tra giới hạn đánh giá
    const reviewCount = await Review.countDocuments({ userId, productId })
    if (reviewCount >= 2) {
      throw new ApiError(403, 'Bạn đã đạt giới hạn đánh giá cho sản phẩm này (tối đa 2 lần)')
    }

    return { orderItem, reviewCount }
  }

  // Tạo đánh giá
  static async createReview(data: {
    userId: string
    productId: string
    orderId?: string
    rating: number
    comment: string
    images?: string[]
  }) {
    const { userId, productId, rating, comment, images = [] } = data
    let { orderId } = data

    // Validate quyền đánh giá
    const { orderItem } = await this.validateReviewPermission(userId, productId)

    if (!orderId) {
      orderId = orderItem.orderId
    }

    // Kiểm tra từ ngữ tục tĩu
    if (this.checkForBadWords(comment)) {
      throw new ApiError(400, 'Nội dung đánh giá chứa từ ngữ không phù hợp. Vui lòng viết lại.')
    }

    // Tạo đánh giá
    const review = await Review.create({
      userId,
      productId,
      orderId,
      rating,
      comment,
      images,
      status: 'approved'
    })

    return review
  }

  // Lấy đánh giá theo sản phẩm
  static async getReviewsByProduct(productId: string, page = 1, limit = 10) {
    if (!productId) {
      return {
        results: [],
        meta: { total: 0, page: 1, limit: 10, pages: 0 }
      }
    }

    const allReviews = await Review.find({
      productId,
      status: 'approved'
    }).sort({ createdAt: -1 }).lean()

    // Populate user info
    for (let review of allReviews) {
      try {
        const user = await UserModel.findById(review.userId)
          .select('fullName email avatar').lean()
        
        review.userId = {
          _id: review.userId,
          fullName: user?.fullName || user?.email || 'Người dùng ẩn danh',
          avatar: user?.avatar || null
        }
      } catch (error) {
        review.userId = {
          _id: review.userId,
          fullName: 'Người dùng ẩn danh',
          avatar: null
        }
      }
    }

    // Phân trang
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedReviews = allReviews.slice(startIndex, endIndex)

    return {
      results: paginatedReviews,
      meta: {
        total: allReviews.length,
        page,
        limit,
        pages: Math.ceil(allReviews.length / limit)
      }
    }
  }

  // Kiểm tra số lần đánh giá
  static async checkUserReviewCount(userId: string, productId: string) {
    const reviewCount = await Review.countDocuments({ userId, productId })
    const canReview = reviewCount < 2

    return {
      count: reviewCount,
      canReview,
      maxReviews: 2
    }
  }

  // Lấy sản phẩm có thể đánh giá
  static async getReviewableProducts(userId: string) {
    const completedOrders = await OrderModel.find({
      userId,
      status: 'completed'
    })

    if (completedOrders.length === 0) {
      return []
    }

    const orderIds = completedOrders.map(order => order._id)
    const populatedOrderItems = await OrderItemModel.find({
      orderId: { $in: orderIds }
    }).populate('productId', 'name image price')

    const validOrderItems = populatedOrderItems.filter(item => 
      item.productId && item.productId._id
    )

    if (validOrderItems.length === 0) {
      return []
    }

    // Tính số lần đánh giá cho từng sản phẩm
    const productReviewCounts = await Review.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: '$productId',
          count: { $sum: 1 }
        }
      }
    ])

    const reviewCountMap = new Map()
    productReviewCounts.forEach(item => {
      reviewCountMap.set(item._id.toString(), item.count)
    })

    // Lọc sản phẩm có thể đánh giá
    const reviewableProducts = validOrderItems
      .filter(item => {
        const productId = item.productId._id.toString()
        const reviewCount = reviewCountMap.get(productId) || 0
        return reviewCount < 2
      })
      .map(item => ({
        orderId: item.orderId,
        productId: item.productId._id,
        productName: item.productId.name,
        productImage: item.productId.image?.[0] || '',
        productPrice: item.productId.price,
        quantity: item.quantity,
        reviewCount: reviewCountMap.get(item.productId._id.toString()) || 0,
        canReview: true
      }))

    // Loại bỏ duplicate
    const uniqueProducts = []
    const seenProductIds = new Set()

    for (const product of reviewableProducts) {
      if (!seenProductIds.has(product.productId.toString())) {
        seenProductIds.add(product.productId.toString())
        uniqueProducts.push(product)
      }
    }

    return uniqueProducts
  }
}