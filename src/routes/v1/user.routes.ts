import express from 'express'
import { userController } from '~/controllers/user.controller'
import verifyAccessToken from '~/middlewares/verifyToken'
import { userValidation } from '~/validations/user.validation'

const Router = express.Router()

Router.route('/')
  .post(userValidation.createUserValidation, userController.createUser)
  .get(userValidation.fetchAllUserValidation, userController.fetchAllUser)

Router.route('/:userId')
  .get(userValidation.fetchInfoUserValidation, userController.fetchInfoUser)
  .patch(userValidation.updateUserValidation, userController.updateUser)
  .delete(userValidation.deleteUserValidation, userController.deleteUser)

export const userRoute = Router
