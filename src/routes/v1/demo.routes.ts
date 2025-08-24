import express from 'express'
import { adminPageController } from '~/controllers/admin-page.controller'
import { softDeleteController } from '~/controllers/soft-delete.controller'
import { softDeleteValidation } from '~/validations/soft-delete.validation'
import { demoAuth, demoAdminCheck } from '~/middlewares/demo-auth'

const router = express.Router()

// Demo soft delete management page (no auth required)
router.get('/soft-delete-manager', demoAuth, demoAdminCheck, adminPageController.renderSoftDeletePage)

// Demo API endpoints (no auth required)
router.get('/soft-delete/:model', demoAuth, demoAdminCheck, softDeleteValidation.modelValidation, softDeleteController.getDeletedItems)
router.patch('/soft-delete/:model/:id/restore', demoAuth, demoAdminCheck, softDeleteValidation.idValidation, softDeleteController.restoreItem)
router.delete('/soft-delete/:model/:id/permanent', demoAuth, demoAdminCheck, softDeleteValidation.idValidation, softDeleteController.permanentDelete)
router.patch('/soft-delete/:model/bulk/restore', demoAuth, demoAdminCheck, softDeleteValidation.bulkValidation, softDeleteController.bulkRestore)
router.delete('/soft-delete/:model/bulk/permanent', demoAuth, demoAdminCheck, softDeleteValidation.bulkValidation, softDeleteController.bulkPermanentDelete)

export const demoRoute = router