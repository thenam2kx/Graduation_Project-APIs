import express from 'express'
import { userController } from '~/controllers/user.controller'
import verifyAccessToken from '~/middlewares/verifyToken'
import { userValidation } from '~/validations/user.validation'

const Router = express.Router()

Router.route('/')
  .post(verifyAccessToken, userValidation.createUserValidation, userController.createUser)
  .get(verifyAccessToken, userValidation.fetchAllUserValidation, userController.fetchAllUser)

Router.route('/:userId')
  .get(verifyAccessToken, userValidation.fetchInfoUserValidation, userController.fetchInfoUser)
  .patch(verifyAccessToken, userValidation.updateUserValidation, userController.updateUser)
  .delete(verifyAccessToken, userValidation.deleteUserValidation, userController.deleteUser)

export const userRoute = Router
