import { Request, Response } from 'express';
import Review from '../models/review.model';
import Product from '../models/product.model';
import Order from '../models/order.model';
import ApiError from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import mongoose from 'mongoose';

// Tạo đánh giá mới
export const createReview = async (req: Request, res: Response) => {
  try {
    const { userId, productId, orderId, rating, comment, images } = req.body;

    // Kiểm tra xem sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Sản phẩm không tồn tại');
    }

    // Kiểm tra xem người dùng đã mua sản phẩm chưa
    const order = await Order.findOne({
      userId,
      status: { $in: ['completed', 'delivered'] }
    });
    
    if (!order) {
      throw new ApiError(403, 'Bạn chỉ có thể đánh giá sản phẩm đã mua');
    }
    
    // Kiểm tra xem đơn hàng có chứa sản phẩm này không
    const orderItem = await mongoose.model('OrderItem').findOne({
      orderId: order._id,
      productId: productId
    });
    
    if (!orderItem) {
      throw new ApiError(403, 'Bạn chỉ có thể đánh giá sản phẩm đã mua');
    }

    // Kiểm tra số lần đánh giá của người dùng cho sản phẩm này
    const reviewCount = await Review.countDocuments({
      userId,
      productId
    });

    if (reviewCount >= 2) {
      throw new ApiError(403, 'Bạn đã đạt giới hạn đánh giá cho sản phẩm này (tối đa 2 lần)');
    }

    // Tạo đánh giá mới
    const review = await Review.create({
      userId,
      productId,
      orderId,
      rating,
      comment,
      images: images || [],
      status: 'pending' // Mặc định là chờ duyệt
    });

    res.status(201).json(
      new ApiResponse(201, review, 'Đánh giá đã được gửi và đang chờ duyệt')
    );
  } catch (error) {
    console.error('Lỗi khi tạo đánh giá:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
    } else {
      res.status(500).json(
        new ApiResponse(500, null, 'Lỗi khi tạo đánh giá')
      );
    }
  }
};

// Lấy tất cả đánh giá (có phân trang và lọc)
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search, startDate, endDate } = req.query;
    
    const query: any = {};
    
    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }
    
    // Lọc theo ngày
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    // Tìm kiếm theo sản phẩm hoặc người dùng
    if (search) {
      const productIds = await Product.find({
        name: { $regex: search, $options: 'i' }
      }).distinct('_id');
      
      const userIds = await mongoose.model('User').find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).distinct('_id');
      
      query.$or = [
        { productId: { $in: productIds } },
        { userId: { $in: userIds } }
      ];
    }
    
    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sort: { createdAt: -1 },
      populate: [
        { path: 'userId', select: 'fullName email' },
        { path: 'productId', select: 'name images' }
      ]
    };
    
    const reviews = await Review.paginate(query, options);
    
    res.status(200).json(
      new ApiResponse(200, {
        results: reviews.docs,
        meta: {
          total: reviews.totalDocs,
          page: reviews.page,
          limit: reviews.limit,
          pages: reviews.totalPages
        }
      }, 'Danh sách đánh giá')
    );
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đánh giá:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Lỗi khi lấy danh sách đánh giá')
    );
  }
};

// Lấy đánh giá theo ID sản phẩm
export const getReviewsByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, status = 'approved' } = req.query;
    
    const query: any = {
      productId,
      status
    };
    
    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sort: { createdAt: -1 },
      populate: { path: 'userId', select: 'fullName' }
    };
    
    const reviews = await Review.paginate(query, options);
    
    res.status(200).json(
      new ApiResponse(200, {
        results: reviews.docs,
        meta: {
          total: reviews.totalDocs,
          page: reviews.page,
          limit: reviews.limit,
          pages: reviews.totalPages
        }
      }, 'Danh sách đánh giá cho sản phẩm')
    );
  } catch (error) {
    console.error('Lỗi khi lấy đánh giá cho sản phẩm:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Lỗi khi lấy đánh giá cho sản phẩm')
    );
  }
};

// Lấy đánh giá theo ID người dùng
export const getReviewsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sort: { createdAt: -1 },
      populate: { path: 'productId', select: 'name images' }
    };
    
    const reviews = await Review.paginate({ userId }, options);
    
    res.status(200).json(
      new ApiResponse(200, {
        results: reviews.docs,
        meta: {
          total: reviews.totalDocs,
          page: reviews.page,
          limit: reviews.limit,
          pages: reviews.totalPages
        }
      }, 'Danh sách đánh giá của người dùng')
    );
  } catch (error) {
    console.error('Lỗi khi lấy đánh giá của người dùng:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Lỗi khi lấy đánh giá của người dùng')
    );
  }
};

// Phê duyệt đánh giá
export const approveReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status: 'approved' },
      { new: true }
    );
    
    if (!review) {
      throw new ApiError(404, 'Không tìm thấy đánh giá');
    }
    
    res.status(200).json(
      new ApiResponse(200, review, 'Đánh giá đã được phê duyệt')
    );
  } catch (error) {
    console.error('Lỗi khi phê duyệt đánh giá:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
    } else {
      res.status(500).json(
        new ApiResponse(500, null, 'Lỗi khi phê duyệt đánh giá')
      );
    }
  }
};

// Từ chối đánh giá
export const rejectReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { 
        status: 'rejected',
        rejectReason: reason || 'Không đáp ứng tiêu chuẩn cộng đồng'
      },
      { new: true }
    );
    
    if (!review) {
      throw new ApiError(404, 'Không tìm thấy đánh giá');
    }
    
    res.status(200).json(
      new ApiResponse(200, review, 'Đánh giá đã bị từ chối')
    );
  } catch (error) {
    console.error('Lỗi khi từ chối đánh giá:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
    } else {
      res.status(500).json(
        new ApiResponse(500, null, 'Lỗi khi từ chối đánh giá')
      );
    }
  }
};

// Xóa đánh giá
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    
    const review = await Review.findByIdAndDelete(reviewId);
    
    if (!review) {
      throw new ApiError(404, 'Không tìm thấy đánh giá');
    }
    
    res.status(200).json(
      new ApiResponse(200, {}, 'Đánh giá đã được xóa')
    );
  } catch (error) {
    console.error('Lỗi khi xóa đánh giá:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
    } else {
      res.status(500).json(
        new ApiResponse(500, null, 'Lỗi khi xóa đánh giá')
      );
    }
  }
};

// Kiểm tra số lần đánh giá của người dùng cho sản phẩm
export const checkUserReviewCount = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;
    
    // Kiểm tra xem người dùng đã mua sản phẩm chưa
    const order = await Order.findOne({
      userId,
      status: { $in: ['completed', 'delivered'] }
    });

    if (!order) {
      res.status(200).json(
        new ApiResponse(200, { count: 0, canReview: false }, 'Người dùng chưa mua sản phẩm này')
      );
      return;
    }
    
    // Kiểm tra xem đơn hàng có chứa sản phẩm này không
    const orderItem = await mongoose.model('OrderItem').findOne({
      orderId: order._id,
      productId: productId
    });
    
    if (!orderItem) {
      res.status(200).json(
        new ApiResponse(200, { count: 0, canReview: false }, 'Người dùng chưa mua sản phẩm này')
      );
      return;
    }
    
    // Đếm số lần đánh giá
    const reviewCount = await Review.countDocuments({
      userId,
      productId
    });
    
    res.status(200).json(
      new ApiResponse(200, {
        count: reviewCount,
        canReview: reviewCount < 2
      }, `Người dùng đã đánh giá ${reviewCount} lần`)
    );
  } catch (error) {
    console.error('Lỗi khi kiểm tra số lần đánh giá:', error);
    res.status(500).json(
      new ApiResponse(500, null, 'Lỗi khi kiểm tra số lần đánh giá')
    );
  }
};