import express from 'express'
import { CartController } from '~/controllers/cart.controller'
import { cartValidation } from '~/validations/cart.validation'

const Router = express.Router()

Router.route('/')
  .post(cartValidation.createCartValidation, CartController.createCart)
  .get(cartValidation.fetchAllCartsValidation, CartController.fetchAllCart)

Router.route('/:cartId').get(cartValidation.fetchInfoCartValidation, CartController.fetchInfoCart)

Router.route('/cart/:cartId').patch(cartValidation.updateCartValidation, CartController.updateCart)

export const CartRoute = Router
