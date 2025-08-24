import mongoose, { Document, Schema } from 'mongoose'

export interface ITest extends Document {
  name: string
  description?: string
  createdAt?: Date
  updatedAt?: Date
}

const TestSchema: Schema<ITest> = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

const TestModel = mongoose.model<ITest>('Test', TestSchema)
export default TestModel