export type UserRole = 'CUSTOMER' | 'ADMIN'

export interface User {
  id: number
  username: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: UserRole
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  phone?: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface UpdateProfilePayload {
  username: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  newPassword: string
}

export interface VerifyResetTokenResponse {
  valid: boolean
  message: string
}
