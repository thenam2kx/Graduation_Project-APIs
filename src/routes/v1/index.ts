import express from 'express'
import { userRoute } from './user.routes'
import { authRoute } from './auth.routes'
import { brandRoute } from './brand.routes'
import { discountsRoute } from './discounts.routes'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/auth', authRoute)
Router.use('/brand', brandRoute)
Router.use('/discounts', discountsRoute)

export const APIs_v1 = Router
