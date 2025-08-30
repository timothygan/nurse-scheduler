import { UserRole } from '@/types'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: UserRole
    hospitalId: string
    hospital: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      hospitalId: string
      hospital: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    hospitalId: string
    hospital: string
  }
}