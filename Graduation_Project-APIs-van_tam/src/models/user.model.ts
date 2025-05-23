import mongoose, { Schema } from 'mongoose'
import MongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete'

export interface IUser extends SoftDeleteDocument {
  name: string
}

const UserSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: { type: String }
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true
  }
)

// Override all methods
UserSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedBy: true, deletedByType: String })

const UserModel = mongoose.model<IUser, SoftDeleteModel<IUser>>('users', UserSchema)

export default UserModel
