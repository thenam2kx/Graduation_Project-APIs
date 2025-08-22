import express from 'express'
import { softDeleteController } from '~/controllers/soft-delete.controller'
import { softDeleteValidation } from '~/validations/soft-delete.validation'
import { verifyToken } from '~/middlewares/verifyToken'
import { checkPermissions } from '~/middlewares/checkPermissions'

const router = express.Router()
const adminOnly = checkPermissions(['admin'])

// Get deleted items
router.get(
  '/:model',
  verifyToken,
  adminOnly,
  softDeleteValidation.modelValidation,
  softDeleteController.getDeletedItems
)

// Restore single item
router.patch(
  '/:model/:id/restore',
  verifyToken,
  adminOnly,
  softDeleteValidation.idValidation,
  softDeleteController.restoreItem
)

// Permanent delete single item
router.delete(
  '/:model/:id/permanent',
  verifyToken,
  adminOnly,
  softDeleteValidation.idValidation,
  softDeleteController.permanentDelete
)

// Bulk restore
router.patch(
  '/:model/bulk/restore',
  verifyToken,
  adminOnly,
  softDeleteValidation.bulkValidation,
  softDeleteController.bulkRestore
)

// Bulk permanent delete
router.delete(
  '/:model/bulk/permanent',
  verifyToken,
  adminOnly,
  softDeleteValidation.bulkValidation,
  softDeleteController.bulkPermanentDelete
)

export const softDeleteRoute = router