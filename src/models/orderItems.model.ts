import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface IOrderItem extends SoftDeleteDocument {
  orderId: string
  productId: string
  variantId: string
  quantity: number
  price: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date
  deleted: boolean
}

const OrderItemSchema = new Schema(
  {
    orderId: { type: String, required: true },
    productId: { type: String, required: true },
    variantId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

OrderItemSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedBy: true,
  deletedByType: String
})

const OrderItemModel = mongoose.model<IOrderItem, SoftDeleteModel<IOrderItem>>('OrderItem', OrderItemSchema)
export default OrderItemModel
