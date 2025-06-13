import express from 'express'
import { addressController } from '~/controllers/address.controller'
import { addressValidation } from '~/validations/address.validation'

const Router = express.Router()

Router.route('/')
  .post(addressValidation.createAddressValidation, addressController.createAddress)
  .get(addressValidation.fetchAllAddressValidation, addressController.fetchAllAddress)

Router.route('/:addressId')
  .get(addressValidation.fetchInfoAddressValidation, addressController.fetchInfoAddress)
  .patch(addressValidation.updateAddressValidation, addressController.updateAddress)
  .delete(addressValidation.deleteAddressValidation, addressController.deleteAddress)

export const addressRoute = Router
