import mongoose, { Schema, Document } from 'mongoose'
import slugify from 'slugify'

export interface ICateblog extends Document {
  name: string
  slug?: string
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

const CateblogSchema: Schema<ICateblog> = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
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
CateblogSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  next()
})

const CateblogModel = mongoose.model<ICateblog>('cateblogs', CateblogSchema)

export default CateblogModel
