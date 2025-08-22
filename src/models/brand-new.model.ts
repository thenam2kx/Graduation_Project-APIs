import mongoose from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'
import slugify from 'slugify'

export interface IBrandNew extends SoftDeleteDocument {
  name: string
  slug?: string
  avatar?: string
  isPublic: boolean
}

const BrandNewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String },
    avatar: { type: String },
    isPublic: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

// Auto generate slug from name
BrandNewSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  next()
})

BrandNewSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: true,
  deletedByType: String,
  indexFields: ['deleted']
})

const BrandNewModel = mongoose.model<IBrandNew, SoftDeleteModel<IBrandNew>>('BrandNew', BrandNewSchema)
export default BrandNewModel