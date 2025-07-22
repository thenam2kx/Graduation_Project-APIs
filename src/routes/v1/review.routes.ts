import express from 'express'
import * as reviewController from '~/controllers/review.controller'
import { verifyToken } from '~/middlewares/verifyToken'
import { checkPermissions } from '~/middlewares/checkPermissions'
import { reviewValidation } from '~/validations/review.validation'

const Router = express.Router()

// Route cho người dùng
Router.route('/').post(verifyToken, reviewValidation.createReviewValidation, reviewController.createReview)
Router.route('/product/:productId').get(reviewController.getReviewsByProduct)
Router.route('/user/:userId').get(verifyToken, reviewController.getReviewsByUser)
Router.route('/check/:userId/:productId').get(verifyToken, reviewController.checkUserReviewCount)

// Route cho admin
Router.route('/').get(verifyToken, checkPermissions(['admin']), reviewController.getAllReviews)
Router.route('/:reviewId/approve').patch(verifyToken, checkPermissions(['admin']), reviewController.approveReview)
Router.route('/:reviewId/reject').patch(verifyToken, checkPermissions(['admin']), reviewValidation.updateReviewStatusValidation, reviewController.rejectReview)
Router.route('/:reviewId').delete(verifyToken, checkPermissions(['admin']), reviewController.deleteReview)

export const reviewRoute = Router