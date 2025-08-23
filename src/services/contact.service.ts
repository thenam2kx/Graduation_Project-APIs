/* eslint-disable @typescript-eslint/no-explicit-any */
import ContactModel, { IContact } from '~/models/contact.model'
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { sendEmail } from '~/utils/sendEmail'

const handleCreateContact = async (data: IContact) => {
  const result = await ContactModel.create({ ...data })
  
  // Gửi email xác nhận cho người dùng
  try {
    await sendEmail(
      data.email,
      'Xác nhận liên hệ - Perfume Store',
      'contact-confirmation',
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message
      }
    )
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError)
  }
  
  // Gửi email thông báo cho admin
  try {
    await sendEmail(
      'thenam2kx.workspace@gmail.com', // Email admin
      '🔔 Liên hệ mới từ khách hàng - Perfume Store',
      'new-contact-admin',
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        createdAt: new Date().toLocaleString('vi-VN')
      }
    )
  } catch (emailError) {
    console.error('Failed to send admin notification email:', emailError)
  }
  
  return result
}

const handleFetchAllContact = async ({
  currentPage,
  limit,
  qs = ''
}: {
  currentPage: number
  limit: number
  qs?: string // hoặc giữ nguyên string và gán default
}) => {
  const { filter, sort, population } = aqp(qs || '') // ✅ đảm bảo qs là chuỗi
  delete filter.current
  delete filter.pageSize

  const offset = (currentPage - 1) * limit
  const defaultLimit = limit || 10
  const results = await ContactModel.findWithDeleted({})
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  const totalItems = results.length
  const totalPages = Math.ceil(totalItems / defaultLimit)
  const paginatedResults = results.slice(offset, offset + defaultLimit)

  return {
    meta: {
      current: currentPage,
      pageSize: defaultLimit,
      pages: totalPages,
      total: totalItems
    },
    results: paginatedResults
  }
}


const handleFetchInfoContact = async (contactId: string) => {
  const contact = await ContactModel.findById(contactId).lean().exec()
  if (!contact) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Liên hệ không tồn tại')
  }
  return contact
}

const handleUpdateContact = async (contactId: string, data: any) => {
  const contact = await ContactModel.updateOne({ _id: contactId }, { ...data })
  if (contact.matchedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Liên hệ không tồn tại')
  }
  return contact
}

const handleDeleteContact = async (contactId: string): Promise<any> => {
  const contact = await ContactModel.delete({ _id: contactId })
  if (!contact) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Liên hệ không tồn tại')
  }
  return contact
}

const handleReplyContact = async (contactId: string, replyMessage: string) => {
  const contact = await ContactModel.findById(contactId)
  if (!contact) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Liên hệ không tồn tại')
  }

  await sendEmail(
    contact.email,
    'Phản hồi từ Perfume Store',
    'contact-reply',
    {
      customerName: contact.name,
      originalMessage: contact.message,
      replyMessage: replyMessage.replace(/\n/g, '<br>')
    }
  )

  await ContactModel.updateOne(
    { _id: contactId },
    { replyMessage, repliedAt: new Date() }
  )

  return { success: true }
}

export const contactService = {
  handleCreateContact,
  handleFetchAllContact,
  handleFetchInfoContact,
  handleUpdateContact,
  handleDeleteContact,
  handleReplyContact
}
