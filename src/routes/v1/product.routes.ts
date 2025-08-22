import express from 'express'
import { productController } from '~/controllers/product.controller'
import { productValidation } from '~/validations/product.validation'

const Router = express.Router()

Router.route('/')
  .post(productValidation.createProductValidation, productController.createProduct)
  .get(productValidation.fetchAllProductValidation, productController.fetchAllProducts)

Router.route('/trash')
  .get(productValidation.fetchAllProductValidation, productController.fetchTrashProducts)

Router.route('/restore/:productId')
  .patch(productValidation.fetchInfoProductValidation, productController.restoreProduct)

Router.route('/force-delete/:productId')
  .delete(productValidation.deleteProductValidation, productController.forceDeleteProduct)

Router.route('/:productId')
  .get(productValidation.fetchInfoProductValidation, productController.fetchInfoProduct)
  .patch(productValidation.updateProductValidation, productController.updateProduct)
  .delete(productValidation.deleteProductValidation, productController.deleteProduct)

export const productRoute = Router
