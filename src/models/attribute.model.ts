import mongoose, { Schema, Document } from 'mongoose'
import slugify from 'slugify'

export interface IAttribute extends Document {
  name: string
  slug: string
  createdAt?: Date
  updatedAt?: Date
}

const AttributeSchema: Schema<IAttribute> = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, trim: true, unique: true }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

// Auto generate slug from name
AttributeSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  next()
})

const AttributeModel = mongoose.model<IAttribute>('attributes', AttributeSchema)

export default AttributeModel
