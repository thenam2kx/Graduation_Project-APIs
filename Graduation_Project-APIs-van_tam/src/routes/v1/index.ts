import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { brandRoute } from './BrandRoutes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/auth', authRoute)
Router.use('/brand', brandRoute)

export const APIs_v1 = Router
