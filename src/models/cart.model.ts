import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface ICart extends SoftDeleteDocument {
  _id: string
  userId: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  deleted: boolean
}

const CartSchema = new Schema(
  {
    userId: { type: String, required: true }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

CartSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
  deletedByType: String
})

const CartModel = mongoose.model<ICart, SoftDeleteModel<ICart>>('Cart', CartSchema)
export default CartModel
