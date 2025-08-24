import mongoose, { Schema, Document } from 'mongoose'
import slugify from 'slugify'

export interface ICategory extends Document {
  name: string
  description: string
  slug: string
  icon: string
  isPublic: boolean
  isDeleted: boolean
  deletedAt?: Date
  createdBy?: {
    _id: string
    email: string
  }
  updatedBy?: {
    _id: string
    email: string
  }
}
const CategorySchema: Schema<ICategory> = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    slug: { type: String, unique: true },
    icon: { type: String, required: false },
    isPublic: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    createdBy: {
      _id: { type: String },
      email: { type: String }
    },
    updatedBy: {
      _id: { type: String },
      email: { type: String }
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }

  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

// Auto generate slug from name
CategorySchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  next()
})

const CategoryModel = mongoose.model<ICategory>('Category', CategorySchema)
export default CategoryModel
