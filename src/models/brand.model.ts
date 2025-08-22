import mongoose, { Document } from 'mongoose'
import { Schema } from 'mongoose'
import slugify from 'slugify'
export interface IBrand extends Document {
  name: string
  slug: string
  avatar?: string
  isPublic: boolean
  createdBy?: {
    _id: string
    email: string
  }
  updateBy?: {
    _id: string
    email: string
  }
}
const BrandSchema: Schema<IBrand> = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    avatar: { type: String },
    isPublic: { type: Boolean, default: false },
    createdBy: {
      _id: { type: String },
      email: { type: String }
    },
    updateBy: {
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
// Auto generate slug from name
BrandSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  next()
})

const BrandModel = mongoose.model<IBrand>('Brand', BrandSchema)
export default BrandModel
