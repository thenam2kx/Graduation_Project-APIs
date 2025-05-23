import express from 'express'
import { userController } from '~/controllers/user.controller'
import { userValidation } from '~/validations/user.validation'

const Router = express.Router()

Router.route('/')
  .post(userValidation.createUserValidation, userController.createUser)
  .get((req, res) => {
    res.send('Get all users')
  })

export const userRoute = Router
