import express from 'express'
import { brandNewController } from '~/controllers/brand-new.controller'

const Router = express.Router()

Router.route('/')
  .get(brandNewController.getAllBrandNews)
  .post(brandNewController.createBrandNew)

Router.route('/deleted')
  .get(brandNewController.getDeletedBrandNews)

Router.route('/:id')
  .delete(brandNewController.deleteBrandNew)

export const brandNewRoute = Router