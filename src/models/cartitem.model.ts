import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface ICartItem extends SoftDeleteDocument {
  _id: string
  cartId: string
  productId: string
  variantId: string
  quantity: number
  price: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  deleted: boolean
}

const CartItemSchema = new Schema(
  {
    cartId: { type: String, required: true },
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

CartItemSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
  deletedByType: String
})

const CartItemModel = mongoose.model<ICartItem, SoftDeleteModel<ICartItem>>('CartItem', CartItemSchema)
export default CartItemModel
