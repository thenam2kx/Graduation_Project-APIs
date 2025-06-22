import express from 'express'
import { wishlistController } from '~/controllers/wishlist.controller'
import { wishlistValidation } from '~/validations/wishlist.validation'

const Router = express.Router()

Router.route('/')
  .post(wishlistValidation.createWishlistValidation, wishlistController.createWishlist)

Router.route('/user/:userId')
  .get(wishlistValidation.fetchWishlistByUserValidation, wishlistController.fetchWishlistByUser)

Router.route('/:wishlistId')
  .delete(wishlistValidation.deleteWishlistValidation, wishlistController.deleteWishlist)

Router.route('/check/:userId/:productId')
  .get(wishlistValidation.checkWishlistValidation, wishlistController.checkWishlist)

export const wishlistRoute = Router