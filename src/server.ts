import express from 'express'
import bodyParser from 'body-parser'
import configViewEngine from './config/viewEngine'
import connection from './config/connection'
import cors from 'cors'
import { APIs_v1 } from './routes/v1'
import { errorHandlingMiddleware } from './middlewares/errorHandlingMiddleware'
import { corsOptions } from './config/cors'
import { requestLimiter } from './middlewares/limiter'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import configEnv from './config/env'
import path from 'path'
import { initFlashSaleCronJobs } from './utils/cron'

const app = express()

// config cors
app.use(cors(corsOptions))

// parse urlencoded request body
app.use(bodyParser.urlencoded({ extended: false }))

// parse json request body
app.use(bodyParser.json())

// config cookie parser
app.use(cookieParser(configEnv.cookie.secret))

// config request limiter
app.use(requestLimiter)

// config security HTTP headers
app.use(helmet())

//config template engine
configViewEngine(app)

app.use('/uploads', cors(corsOptions), (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  },
  express.static(path.join(__dirname, '../public/uploads')))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use('/api/v1', APIs_v1)
// config static file
app.use('/', async (req, res) => {
  return res.render('home')
})

// Handle error Middleware
app.use(errorHandlingMiddleware)

// Start server
;(async () => {
  try {
    await connection()
    const server = app.listen(configEnv.app.port, configEnv.app.host, () => {
      console.log(`🚀 Server running on http://${configEnv.app.host}:${configEnv.app.port}`)
      console.log(`🚀 Health check available at http://${configEnv.app.host}:${configEnv.app.port}/health`)

      // Khởi tạo các tác vụ cron cho flash sale
      try {
        initFlashSaleCronJobs()
      } catch (cronError) {
        console.warn('⚠️ Flash sale cron jobs initialization failed:', cronError)
      }

      // Khởi tạo tất cả cron jobs từ database
      try {
        const { cronJobService } = require('./services/cron_job.service')
        cronJobService.initAllCronJobs()
      } catch (cronError) {
        console.warn('⚠️ Database cron jobs initialization failed:', cronError)
      }
    })

    server.on('error', (error: any) => {
      console.error('🚨 Server error:', error)
      process.exit(1)
    })

  } catch (error) {
    console.error('🚨 Failed to start server:', error)
    process.exit(1)
  }
})()
