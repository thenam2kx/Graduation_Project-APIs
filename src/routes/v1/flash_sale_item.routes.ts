import express from 'express'
import { flashSaleItemController } from '~/controllers/flash_sale_item.controller'
// import { flashSaleItemValidation } from '~/validations/flash_sale_item.validation' // Nếu có validation, bỏ comment

const Router = express.Router()

Router.route('/').post(flashSaleItemController.createFlashSaleItem).get(flashSaleItemController.fetchAllFlashSaleItems)

Router.route('/:itemId')
  .get(flashSaleItemController.fetchInfoFlashSaleItem)
  .patch(flashSaleItemController.updateFlashSaleItem)
  .delete(flashSaleItemController.deleteFlashSaleItem)

export const flashSaleItemRoute = Router
