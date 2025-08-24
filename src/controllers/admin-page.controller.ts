import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { softDeleteService } from '~/services/soft-delete.service'
import ProductModel from '~/models/product.model'
import UserModel from '~/models/user.model'
import CategoryModel from '~/models/category.model'
import BrandModel from '~/models/brand.model'
import BlogModel from '~/models/blog.model'
import ContactModel from '~/models/contact.model'
import CateblogModel from '~/models/blogcategory.model'
import DiscountModel from '~/models/discounts.model'
import AttributeModel from '~/models/attribute.model'
import WishlistModel from '~/models/wishlist.model'

const renderSoftDeletePage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get stats for all models with soft delete support
    const stats = {
      products: await ProductModel.countDeleted(),
      users: await UserModel.countDeleted(),
      categories: await CategoryModel.countDeleted(),
      brands: await BrandModel.countDeleted(),
      blogs: await BlogModel.countDeleted(),
      blogcategories: await CateblogModel.countDeleted(),
      discounts: await DiscountModel.countDeleted(),
      attributes: await AttributeModel.countDeleted(),
      contacts: await ContactModel.countDeleted(),
      wishlists: await WishlistModel.countDeleted()
    }

    res.render('soft-delete-manager', {
      title: 'Quản lý Xóa Mềm',
      stats,
      user: req.user
    })
  } catch (error) {
    next(error)
  }
}

export const adminPageController = {
  renderSoftDeletePage
}