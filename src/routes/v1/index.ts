import express from 'express'
import { userController } from '~/controllers/user.controller'
import { userValidation } from '~/validations/user.validation'

const Router = express.Router()

Router.route('/users')
  .post(userValidation.createUserValidation, userController.createUser)
  .get((req, res) => {
    res.send('Get all users')
  })

export const APIs_v1 = Router
