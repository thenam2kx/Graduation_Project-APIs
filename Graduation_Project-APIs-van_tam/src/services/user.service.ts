import UserModel from '~/models/user.model'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleCreateUser = async (data: any) => {
  const result = await UserModel.create({ ...data })
  return result
}

export const userService = {
  handleCreateUser
}
