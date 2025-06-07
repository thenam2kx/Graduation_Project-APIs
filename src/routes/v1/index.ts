import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { brandRoute } from './brand.routes'
import { discountsRoute } from './discounts.routes'
import { cateblogRoute } from './blogcategory.routes'
import { blogRoute } from './blog.routes'
import { categoryRoute } from './category.routes'
import { fileRoute } from './file.route'
import { notificationRoute } from './notification.routes'
import { productRoute } from './product.routes'
import { productVariantRoute } from './productVariant.routes'
import { OrderItemsRoute } from './orderitem.routes'
import { contactRoute } from './contact.routes'
import { attributeRoute } from './attribute.routes'
import { variantAttributesRoute } from './variantAttribute.routes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/blogs', blogRoute)
Router.use('/auth', authRoute)
Router.use('/brand', brandRoute)
Router.use('/discounts', discountsRoute)
Router.use('/cateblog', cateblogRoute)
Router.use('/products', productRoute)
Router.use('/variants', productVariantRoute)
Router.use('/attributes', attributeRoute)
Router.use('/variantsat', variantAttributesRoute)
Router.use('/categories', categoryRoute)
Router.use('/files', fileRoute)
Router.use('/notifications', notificationRoute)
Router.use('/contacts', contactRoute)
Router.use('/orderitems', OrderItemsRoute)

export const APIs_v1 = Router
