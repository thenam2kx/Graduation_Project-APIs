import express from 'express'
import { verifyToken } from '~/middlewares/verifyToken'
import { checkPermissions } from '~/middlewares/checkPermissions'
import { adminPageController } from '~/controllers/admin-page.controller'

const router = express.Router()

// Serve soft delete dashboard
router.get('/soft-delete', verifyToken, checkPermissions(['admin']), adminPageController.renderSoftDeletePage)

export const adminDashboardRoute = router