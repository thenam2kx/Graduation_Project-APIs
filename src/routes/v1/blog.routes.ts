import express from 'express'
import { blogController } from '~/controllers/blog.controller'
import { blogValidation } from '~/validations/blog.validation'

const Router = express.Router()

Router.route('/')
  .post(blogValidation.createBlogValidation, blogController.createBlog)
  .get(blogValidation.fetchAllBlogValidation, blogController.fetchAllBlog)

Router.route('/status/:blogId').patch(blogValidation.updateBlogStatusValidation, blogController.updateBlogStatus)

Router.route('/trash')
  .get(blogValidation.fetchAllBlogValidation, blogController.fetchTrashBlogs)

Router.route('/restore/:blogId')
  .patch(blogValidation.fetchInfoBlogValidation, blogController.restoreBlog)

Router.route('/force-delete/:blogId')
  .delete(blogValidation.deleteBlogValidation, blogController.forceDeleteBlog)

Router.route('/by-category/:categoryId').get(
  blogValidation.fetchBlogByCategoryValidation,
  blogController.fetchBlogByCategory
)

Router.route('/:blogId')
  .get(blogValidation.fetchInfoBlogValidation, blogController.fetchInfoBlog)
  .patch(blogValidation.updateBlogValidation, blogController.updateBlog)
  .delete(blogValidation.deleteBlogValidation, blogController.deleteBlog)

export const blogRoute = Router
