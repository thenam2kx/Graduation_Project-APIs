import mongoose from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'
import { Schema } from 'mongoose'

export const DISCOUNT_STATUS = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING', 
  ENDED: 'ENDED'
} as const

export interface IDiscounts extends SoftDeleteDocument {
  code: string
  description: string
  type: string
  value: number
  min_order_value: number
  max_discount_amount: number
  status: string

  startDate: Date
  endDate: Date
  usage_limit: number
  usage_per_user: number
  used_count: number
  createdBy?: {
    _id: string
    email: string
  }
  updateBy?: {
    _id: string
    email: string
  }
}

const DiscountSchema: Schema<IDiscounts> = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['%', 'Vnd'], required: true },
    value: { type: Number, required: true },
    min_order_value: { type: Number, default: 0 },
    max_discount_amount: { type: Number },
    status: {
      type: String,
      enum: Object.values(DISCOUNT_STATUS),
      required: true,
      default: DISCOUNT_STATUS.UPCOMING
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usage_limit: { type: Number, required: true },
    usage_per_user: { type: Number, required: true },
    used_count: { type: Number, default: 0 },
    createdBy: {
      _id: { type: String },
      email: { type: String }
    },
    updateBy: {
      _id: { type: String },
      email: { type: String }
    },
    deletedBy: {
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

DiscountSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedBy: true,
  deletedByType: String
})

const DiscountModel = mongoose.model<IDiscounts, SoftDeleteModel<IDiscounts>>('Discounts', DiscountSchema)
export default DiscountModel