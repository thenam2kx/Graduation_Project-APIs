import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { blogRoute } from './blog.routes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/blogs', blogRoute)
Router.use('/auth', authRoute)

export const APIs_v1 = Router
