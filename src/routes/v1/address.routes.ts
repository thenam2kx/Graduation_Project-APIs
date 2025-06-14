import express from 'express'
import { addressController } from '~/controllers/address.controller'
import { addressValidation } from '~/validations/address.validation'

const Router = express.Router()

Router.route('/users/:userId')
  .post(
    addressValidation.validateUserIdParam,
    addressValidation.createAddressValidation,
    addressController.createAddress
  )
  .get(
    addressValidation.validateUserIdParam,
    addressValidation.fetchAllAddressValidation,
    addressController.fetchAllAddressByUser
  )

Router.route('/users/:userId/:addressId')
  .get(addressValidation.validateAddressIdParam, addressController.fetchInfoAddressByUser)
  .patch(
    addressValidation.validateAddressIdParam,
    addressValidation.updateAddressValidation,
    addressController.updateAddressByUser
  )
  .delete(addressValidation.validateAddressIdParam, addressController.deleteAddressByUser)

export const addressRoute = Router
