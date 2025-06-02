import express from 'express'
import upload from '~/config/multer'
import { fileController } from '~/controllers/file.controller'

const Router = express.Router()

Router.route('/upload').post(upload.single('image'), fileController.uploadFile)
Router.route('/').get(fileController.fetchAllFiles)
Router.route('/:fileId').delete(fileController.deleteFile)

export const fileRoute = Router
