export function createNotificationService({ NotificationModel, UserModel }) {
  async function notify(recipient, values) {
    if (!recipient) return
    try {
      await NotificationModel.updateOne(
        { recipient, eventKey: values.eventKey },
        { $setOnInsert: { recipient, ...values } },
        { upsert: true },
      )
    } catch (error) {
      // Notifications are best effort: they must never roll back the report/task action.
      console.warn('notification_write_failed', { message: error?.message })
    }
  }

  return {
    notify,
    async notifyAdmins(values) {
      try {
        const admins = await UserModel.find({ role: 'admin', isActive: true, approvalStatus: 'approved' }).select('_id').lean()
        await Promise.all(admins.map((admin) => notify(admin._id, values)))
      } catch (error) {
        console.warn('notification_recipients_failed', { message: error?.message })
      }
    },
  }
}
