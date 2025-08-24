import mongoose, { Schema, Types, Document } from 'mongoose'

export interface IProductVariant extends Document {
  productId: Types.ObjectId
  sku: string
  price: number
  stock: number
  image?: string
  createdBy?: { _id: string; email: string }
  updatedBy?: { _id: string; email: string }
}

const ProductVariantSchema: Schema<IProductVariant> = new mongoose.Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'products', required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    image: { type: String, required: false },
    createdBy: {
      _id: { type: String },
      email: { type: String }
    },
    updatedBy: {
      _id: { type: String },
      email: { type: String }
    },

  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

ProductVariantSchema.virtual('variant_attributes', {
  ref: 'variant_attributes',
  localField: '_id',
  foreignField: 'variantId',
  justOne: false
})
ProductVariantSchema.set('toObject', { virtuals: true })
ProductVariantSchema.set('toJSON', { virtuals: true })

const ProductVariantModel = mongoose.model<IProductVariant>(
  'product_variants',
  ProductVariantSchema
)

export default ProductVariantModel
