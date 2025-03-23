import 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string
        name: string
      }
    }

    interface Response {
      json: (data: any) => Response
    }
  }
}
