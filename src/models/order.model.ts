import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface IOrder extends SoftDeleteDocument {
  userId?: string
  addressId?: string
  addressFree: string
  totalPrice?: number
  shippingPrice?: number
  discountId?: string
  status?: string
  shippingMethod?: string
  paymentMethod?: string
  paymentStatus?: string
  note?: string
  createdBy?: {
    _id: string
    email: string
  }
  updatedBy?: {
    _id: string
    email: string
  }
}

const OrderSchema: Schema<IOrder> = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    addressId: { type: Schema.Types.ObjectId, ref: 'addresses', required: true },
    addressFree: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    discountId: { type: Schema.Types.ObjectId, ref: 'Discounts', default: null },
    status: { type: String, default: 'pending' },
    shippingMethod: { type: String, default: 'standard' },
    paymentMethod: { type: String, default: 'credit_card' },
    paymentStatus: { type: String, default: 'unpaid' },
    note: { type: String, default: '' },
    createdBy: {
      _id: { type: String },
      email: { type: String }
    },
    updatedBy: {
      _id: { type: String },
      email: { type: String }
    },
    deletedBy: {
      _id: { type: String },
      email: { type: String }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

// Override all methods
OrderSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedBy: true, deletedByType: String })

const OrderModel = mongoose.model<IOrder, SoftDeleteModel<IOrder>>('orders', OrderSchema)

export default OrderModel
