import express from 'express'
import { cateblogController } from '~/controllers/blogcategory.controller'
import { cateblogValidation } from '~/validations/blogcategory.validation'

const Router = express.Router()

Router.route('/')
  .post(cateblogValidation.createCateblogValidation, cateblogController.createCateblog)
  .get(cateblogValidation.fetchAllCateblogValidation, cateblogController.fetchAllCateblog)

Router.route('/trash')
  .get(cateblogValidation.fetchAllCateblogValidation, cateblogController.fetchTrashCateblogs)

Router.route('/restore/:cateblogId')
  .patch(cateblogValidation.fetchInfoCateblogValidation, cateblogController.restoreCateblog)

Router.route('/force-delete/:cateblogId')
  .delete(cateblogValidation.deleteCateblogValidation, cateblogController.forceDeleteCateblog)

Router.route('/:cateblogId')
  .get(cateblogValidation.fetchInfoCateblogValidation, cateblogController.fetchInfoCateblog)
  .patch(cateblogValidation.updateCateblogValidation, cateblogController.updateCateblog)
  .delete(cateblogValidation.deleteCateblogValidation, cateblogController.deleteCateblog)

export const cateblogRoute = Router
