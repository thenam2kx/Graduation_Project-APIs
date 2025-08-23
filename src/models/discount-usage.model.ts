import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface IDiscountUsage extends SoftDeleteDocument {
  userId: string
  discountId: string
  orderId: string
  usedAt: Date
}

const DiscountUsageSchema: Schema<IDiscountUsage> = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    discountId: { type: Schema.Types.ObjectId, ref: 'Discounts', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'orders', required: true },
    usedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

// Tạo index unique để đảm bảo 1 user chỉ dùng 1 mã giảm giá 1 lần
DiscountUsageSchema.index({ userId: 1, discountId: 1 }, { unique: true })

DiscountUsageSchema.plugin(MongooseDelete, {
  overrideMethods: 'all',
  deletedBy: true,
  deletedByType: String
})

const DiscountUsageModel = mongoose.model<IDiscountUsage, SoftDeleteModel<IDiscountUsage>>('DiscountUsage', DiscountUsageSchema)
export default DiscountUsageModel