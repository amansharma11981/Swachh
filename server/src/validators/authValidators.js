import { z } from 'zod'

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or fewer')
const emailSchema = z.string().trim().email('Enter a valid email address').max(254).transform((value) => value.toLowerCase())

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().max(128).optional(),
}).strict().refine((data) => !data.confirmPassword || data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict()
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  avatarUrl: z.string().url().max(2048).optional().or(z.literal('')),
}).strict().refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one profile field' })
export const roleSchema = z.object({ role: z.enum(['citizen', 'worker', 'admin']) }).strict()
