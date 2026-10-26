import mongoose from 'mongoose'
import { notFound } from '../utils/errors.js'

export function notificationController({ NotificationModel }) {
  return {
    list: async (request, response) => {
      const page = Math.max(1, Math.min(Number.parseInt(request.query.page, 10) || 1, 10000))
      const limit = Math.max(1, Math.min(Number.parseInt(request.query.limit, 10) || 20, 50))
      const filter = { recipient: request.user.id }
      const [items, unreadCount, total] = await Promise.all([
        NotificationModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        NotificationModel.countDocuments({ ...filter, readAt: null }),
        NotificationModel.countDocuments(filter),
      ])
      response.json({ success: true, data: { items: items.map((item) => ({ id: String(item._id), type: item.type, title: item.title, message: item.message, href: item.href, createdAt: item.createdAt, readAt: item.readAt })), unreadCount, total, page, limit } })
    },
    markRead: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const result = await NotificationModel.updateOne({ _id: request.params.id, recipient: request.user.id, readAt: null }, { $set: { readAt: new Date() } })
      if (!result.matchedCount) {
        const exists = await NotificationModel.exists({ _id: request.params.id, recipient: request.user.id })
        if (!exists) throw notFound()
      }
      response.json({ success: true, data: { markedRead: true } })
    },
    markAllRead: async (request, response) => {
      const result = await NotificationModel.updateMany({ recipient: request.user.id, readAt: null }, { $set: { readAt: new Date() } })
      response.json({ success: true, data: { modifiedCount: result.modifiedCount } })
    },
  }
}
