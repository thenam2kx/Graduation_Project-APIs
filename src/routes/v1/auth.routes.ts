import express from 'express'

const Router = express.Router()

Router.route('/').get((req, res) => {
  res.send('Get all routes auth')
})

export const authRoute = Router
