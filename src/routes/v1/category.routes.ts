import express from 'express'
import { categoryController } from '~/controllers/category.controller'
import { categoryValidation } from '~/validations/category.validation'

const Router = express.Router()

Router.route('/')
  .post(categoryValidation.createCategoryValidation, categoryController.createCategory)
  .get(categoryValidation.fetchAllCategoriesValidation, categoryController.fetchAllCategories)

Router.route('/trash')
  .get(categoryValidation.fetchAllCategoriesValidation, categoryController.fetchTrashCategories)

Router.route('/restore/:categoryId')
  .patch(categoryValidation.fetchCategoryByIdValidation, categoryController.restoreCategory)

Router.route('/force-delete/:categoryId')
  .delete(categoryValidation.deleteCategoryValidation, categoryController.forceDeleteCategory)

Router.route('/:categoryId')
  .get(categoryValidation.fetchCategoryByIdValidation, categoryController.fetchCategoryById)
  .patch(categoryValidation.updateCategoryValidation, categoryController.updateCategory)
  .delete(categoryValidation.deleteCategoryValidation, categoryController.deleteCategory)

export const categoryRoute = Router
