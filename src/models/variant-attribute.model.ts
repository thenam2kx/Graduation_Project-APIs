import mongoose, { Schema, Types, Document } from 'mongoose'

export interface IVariantAttribute extends Document {
  variantId: Types.ObjectId
  attributeId: Types.ObjectId
  value: string
  createdBy?: { _id: string; email: string }
  updatedBy?: { _id: string; email: string }
}

const VariantAttributeSchema: Schema<IVariantAttribute> = new mongoose.Schema(
  {
    variantId: { type: Schema.Types.ObjectId, ref: 'product_variants', required: true },
    attributeId: { type: Schema.Types.ObjectId, ref: 'attributes', required: true },
    value: { type: String, required: true },
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

VariantAttributeSchema.virtual('attributes', {
  ref: 'attributes',
  localField: 'attributeId',
  foreignField: '_id',
  justOne: false
})
VariantAttributeSchema.set('toObject', { virtuals: true })
VariantAttributeSchema.set('toJSON', { virtuals: true })

const VariantAttributeModel = mongoose.model<IVariantAttribute>(
  'variant_attributes',
  VariantAttributeSchema
)

export default VariantAttributeModel
