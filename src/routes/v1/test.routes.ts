import express from 'express'
import { testController } from '~/controllers/test.controller'

const Router = express.Router()

Router.get('/', testController)

export const testRoute = Router