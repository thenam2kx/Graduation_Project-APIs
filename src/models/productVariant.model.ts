import mongoose, { Schema, Types } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface IProductVariant extends SoftDeleteDocument {
  productId: Types.ObjectId
  sku: string
  price: number
  stock: number
  image: string
  createdBy?: { _id: string; email: string }
  updatedBy?: { _id: string; email: string }
  deletedByInfo?: { _id: string; email: string }
}

const ProductVariantSchema: Schema<IProductVariant> = new mongoose.Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'products', required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    image: { type: String, required: true },
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

ProductVariantSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: false
})

const ProductVariantModel = mongoose.model<IProductVariant, SoftDeleteModel<IProductVariant>>(
  'product_variants',
  ProductVariantSchema
)

export default ProductVariantModel
