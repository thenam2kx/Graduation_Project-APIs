import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'
import slugify from 'slugify'

export interface IAttribute extends SoftDeleteDocument {
  name: string
  slug: string
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date
  deleted?: boolean
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

AttributeSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedAt: true,
  deletedBy: false
})

const AttributeModel = mongoose.model<IAttribute, SoftDeleteModel<IAttribute>>('attributes', AttributeSchema)

export default AttributeModel
