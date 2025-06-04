import mongoose, { Schema, Types } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface IProduct extends SoftDeleteDocument {
  name: string
  description?: string
  slug: string
  categoryId: Types.ObjectId
  brandId: Types.ObjectId
  price: number
  image: string
  stock: number
  capacity: number
  discountId?: Types.ObjectId
  createdBy?: { _id: string; email: string }
  updatedBy?: { _id: string; email: string }
  deletedByInfo?: { _id: string; email: string }
}

const ProductSchema: Schema<IProduct> = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    slug: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'categories', required: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'brand', required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    stock: { type: Number, required: true },
    capacity: { type: Number, required: true },
    discountId: { type: Schema.Types.ObjectId, ref: 'discounts', default: null },
    createdBy: {
      _id: { type: String },
      email: { type: String }
    },
    updatedBy: {
      _id: { type: String },
      email: { type: String }
    },
    deletedByInfo: {
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

ProductSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: false
})

const ProductModel = mongoose.model<IProduct, SoftDeleteModel<IProduct>>('products', ProductSchema)

export default ProductModel
