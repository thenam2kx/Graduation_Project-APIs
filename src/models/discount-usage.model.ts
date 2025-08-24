import mongoose from 'mongoose'
import { Schema } from 'mongoose'

export interface IDiscountUsage {
  userId: string
  discountId: string
  orderId: string
  usedAt: Date
}

const DiscountUsageSchema: Schema<IDiscountUsage> = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    discountId: { type: Schema.Types.ObjectId, ref: 'Discounts', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    usedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

// Index để tăng tốc độ truy vấn
DiscountUsageSchema.index({ userId: 1, discountId: 1 }, { unique: true })

const DiscountUsageModel = mongoose.model<IDiscountUsage>('DiscountUsage', DiscountUsageSchema)
export default DiscountUsageModel