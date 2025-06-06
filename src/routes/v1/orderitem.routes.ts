import express from 'express'
import { OrderItemController } from '~/controllers/orderitem.controller'
import { orderItemValidation } from '~/validations/orderitem.validattion'

const Router = express.Router()

Router.route('/')
  .post(orderItemValidation.createOrderItemValidation, OrderItemController.createOrderItem)
  .get(orderItemValidation.fetchAllOrderItemValidation, OrderItemController.fetchAllOrderItem)

Router.route('/:orderId')
  .get(orderItemValidation.fetchInfoOrderItemValidation, OrderItemController.fetchInfoOrderItem)
  .patch(orderItemValidation.updateOrderItemValidation, OrderItemController.updateOrderItem)
  .delete(orderItemValidation.deleteOrderItemValidation, OrderItemController.deleteOrderItem)

export const OrderItemsRoute = Router
