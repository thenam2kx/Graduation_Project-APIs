import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { brandRoute } from './brand.routes'
import { discountsRoute } from './discounts.routes'
import { cateblogRoute } from './blogcategory.routes'
import { blogRoute } from './blog.routes'
import { categoryRoute } from './category.routes'
import { fileRoute } from './file.route'
import { productRoute } from './product.routes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/blogs', blogRoute)
Router.use('/auth', authRoute)
Router.use('/brand', brandRoute)
Router.use('/discounts', discountsRoute)
Router.use('/cateblog', cateblogRoute)
Router.use('/products', productRoute)
Router.use('/categories', categoryRoute)
Router.use('/files', fileRoute)

export const APIs_v1 = Router
