import express from 'express'
import { flashSaleController } from '~/controllers/flash_sale.controller'

const Router = express.Router()

Router.route('/').post(flashSaleController.createFlashSale).get(flashSaleController.fetchAllFlashSales)

Router.route('/:flashSaleId')
  .get(flashSaleController.fetchInfoFlashSale)
  .patch(flashSaleController.updateFlashSale)
  .delete(flashSaleController.deleteFlashSale)

export const flashSaleRoute = Router
