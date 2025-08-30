import { getServerSession } from 'next-auth/next'
import { authOptions } from './config'
import { UserRole } from '@/types'
import bcrypt from 'bcryptjs'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Authentication required')
  }
  return session.user
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  console.log('🔍 requireRole - Expected:', role, 'Actual:', (user as any).role)
  if ((user as any).role !== role) {
    console.log('❌ Role check failed - user role:', (user as any).role, 'required:', role)
    throw new Error(`${role} role required`)
  }
  return user
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}