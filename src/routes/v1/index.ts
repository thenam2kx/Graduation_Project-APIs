import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { cateblogRoute } from './blogcategory.routes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/auth', authRoute)
Router.use('/cateblog', cateblogRoute)

export const APIs_v1 = Router
