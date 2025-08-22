import { NextFunction, Request, Response } from 'express'

// Demo middleware để bypass auth cho testing
export const demoAuth = (req: Request, res: Response, next: NextFunction) => {
  // Mock user for demo
  req.user = {
    _id: 'demo-admin-id',
    email: 'admin@demo.com',
    role: 'admin'
  }
  next()
}

export const demoAdminCheck = (req: Request, res: Response, next: NextFunction) => {
  // Always allow for demo
  next()
}