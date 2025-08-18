import nodemailer from 'nodemailer'
import ejs from 'ejs'
import path from 'path'
import configEnv from '~/config/env'

const transporter = nodemailer.createTransport({
  host: configEnv.email.host,
  port: 587,
  secure: false,
  auth: {
    user: configEnv.email.auth.user,
    pass: configEnv.email.auth.pass
  }
})

export const sendEmail = async (to: string, subject: string, templateName: string, data: object) => {
  // Try production path first, then fallback to development path
  let templatePath = path.join(__dirname, '../views', `${templateName}.ejs`)
  
  // Check if running in production and template doesn't exist in dist
  const fs = require('fs')
  if (!fs.existsSync(templatePath)) {
    // Fallback to source directory for development or if views not copied to dist
    templatePath = path.join(process.cwd(), 'src/views', `${templateName}.ejs`)
  }

  // Render EJS template thành HTML
  const html = await ejs.renderFile(templatePath, data)

  // Gửi email
  const mailOptions = {
    from: configEnv.email.auth.user,
    to,
    subject,
    html
  }

  await transporter.sendMail(mailOptions)
  console.log(`Email sent to ${to}`)
}
