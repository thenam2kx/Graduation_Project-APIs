import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { cateblogRoute } from './blogcategory.routes'
import { blogRoute } from './blog.routes'
import { categoryRoute } from './category.routes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/blogs', blogRoute)
Router.use('/auth', authRoute)
Router.use('/cateblog', cateblogRoute)
Router.use('/categories', categoryRoute)

export const APIs_v1 = Router
