import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          console.log('🔐 Auth attempt for:', credentials.email)
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { hospital: true, nurseProfile: true }
          })

          if (!user) {
            console.log('❌ User not found:', credentials.email)
            return null
          }

          console.log('✅ User found:', user.email, 'Role:', user.role)

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isPasswordValid) {
            console.log('❌ Invalid password for:', credentials.email)
            return null
          }

          console.log('✅ Password valid for:', credentials.email)

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            hospitalId: user.hospitalId,
            hospital: user.hospital.name,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.hospitalId = user.hospitalId
        token.hospital = user.hospital
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).hospitalId = token.hospitalId
        ;(session.user as any).hospital = token.hospital
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
}