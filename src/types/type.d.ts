import 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        role: string
        email: string
        name: string
      }
    }

    interface Response {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json: (data: any) => Response
    }
  }

  interface IUser {
    _id: string
    email: string
    name: string
    role: string
    password?: string
    passwordResetToken?: string
    passwordResetExpires?: Date
    verifyEmailToken?: string
    verifyEmailExpires?: Date
  }

  interface IMeta {
    current: number
    pages: number
    pageSize: number
    total: number
  }
}
