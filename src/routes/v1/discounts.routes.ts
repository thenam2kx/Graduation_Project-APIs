import express from 'express'
import { discountsController } from '~/controllers/discounts.controller'
import { discountsValidation } from '~/validations/discounts.validation'
import { verifyToken } from '~/middlewares/verifyToken'

const Router = express.Router()
Router.route('/')
  .post(discountsValidation.createDiscountsValidation, discountsController.createDiscounts)
  .get(discountsValidation.fetchAllDiscountsValidation, discountsController.fetchAllDiscounts)
Router.route('/apply')
  .post(verifyToken, discountsController.applyDiscount)

Router.route('/rollback')
  .post(verifyToken, discountsValidation.rollbackDiscountValidation, discountsController.rollbackDiscount)

Router.route('/code/:code')
  .get(verifyToken, discountsValidation.getDiscountByCodeValidation, discountsController.getDiscountByCode)

Router.route('/:discountsID')
  .get(discountsValidation.fetchDiscountsByIdValidation, discountsController.fetchDiscountsById)
  .patch(discountsValidation.updateDiscountsValidation, discountsController.updateDiscounts)
  .delete(discountsValidation.deleteDiscountsValidation, discountsController.deleteDiscounts)

export const discountsRoute = Router
