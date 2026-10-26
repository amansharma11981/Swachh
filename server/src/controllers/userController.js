import { toSafeUser } from '../models/User.js'
import { notFound, AppError } from '../utils/errors.js'

export function userController({ UserModel }) {
  return {
    getMe: (request, response) => response.json({ success: true, data: { user: request.user } }),
    updateMe: async (request, response) => {
      const user = await UserModel.findSafeById(request.user.id)
      if (!user || !user.isActive) throw notFound()
      Object.assign(user, request.validatedBody)
      await user.save()
      response.json({ success: true, data: { user: toSafeUser(user) } })
    },
    listUsers: async (_request, response) => {
      const users = await UserModel.find().sort({ createdAt: -1 }).limit(100).lean()
      response.json({ success: true, data: { users: users.map(toSafeUser) } })
    },
    listApprovalRequests: async (_request, response) => {
      const users = await UserModel.find({ approvalStatus: 'pending', requestedRole: { $in: ['worker', 'admin'] } }).sort({ createdAt: 1 }).limit(100).lean()
      response.json({ success: true, data: { requests: users.map(toSafeUser) } })
    },
    decideApprovalRequest: async (request, response) => {
      let target
      try { target = await UserModel.findSafeById(request.params.id) } catch { throw notFound() }
      if (!target || target.approvalStatus !== 'pending' || !['worker', 'admin'].includes(target.requestedRole)) throw notFound()
      if (request.validatedBody.decision === 'approve') {
        target.role = target.requestedRole
        target.isActive = true
        target.approvalStatus = 'approved'
      } else {
        target.role = 'citizen'
        target.isActive = false
        target.approvalStatus = 'rejected'
      }
      await target.save()
      response.json({ success: true, data: { user: toSafeUser(target) } })
    },
    updateRole: async (request, response) => {
      let target
      try { target = await UserModel.findSafeById(request.params.id) } catch { throw notFound() }
      if (!target) throw notFound()
      if (target.approvalStatus === 'pending') throw new AppError(409, 'APPROVAL_REQUIRED', 'Review this account through the access requests queue first')
      if (target.role === 'admin' && request.validatedBody.role !== 'admin' && target.isActive) {
        const activeAdmins = await UserModel.countDocuments({ role: 'admin', isActive: true })
        if (activeAdmins <= 1) throw new AppError(409, 'LAST_ADMIN', 'The final active administrator cannot be demoted')
      }
      target.role = request.validatedBody.role
      target.requestedRole = null
      target.approvalStatus = 'approved'
      target.isActive = true
      await target.save()
      response.json({ success: true, data: { user: toSafeUser(target) } })
    },
  }
}
