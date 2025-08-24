import mongoose, { Schema, Document } from 'mongoose'

export interface IBlog extends Document {
  title: string
  slug: string
  content: string
  image?: string
  categoryBlogId?: string
  isPublic?: boolean
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

const BlogSchema: Schema<IBlog> = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    image: { type: String },
    categoryBlogId: { type: String },
    isPublic: { type: Boolean, default: false },
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

const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema)
export default BlogModel
