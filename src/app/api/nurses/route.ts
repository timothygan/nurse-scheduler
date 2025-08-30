import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, hashPassword } from '@/lib/auth/utils'
import { apiSuccess, apiError } from '@/lib/api/response'
import { UserRole, ShiftType } from '@/types'

export async function GET() {
  try {
    const user = await requireRole('SCHEDULER')
    const hospitalId = (user as any).hospitalId

    const nurses = await prisma.user.findMany({
      where: {
        hospitalId,
        role: 'NURSE'
      },
      include: {
        nurseProfile: true
      },
      orderBy: {
        lastName: 'asc'
      }
    })

    return apiSuccess(nurses)
  } catch (error: any) {
    console.error('Failed to fetch nurses:', error)
    return apiError(error.message || 'Failed to fetch nurses', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('SCHEDULER')
    const body = await request.json()
    
    const {
      email,
      firstName,
      lastName,
      password,
      employeeId,
      hireDate,
      seniorityLevel,
      shiftTypes,
      qualifications,
      contractHoursPerWeek,
      maxShiftsPerBlock
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !password || !employeeId) {
      return apiError('Email, name, password, and employee ID are required')
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return apiError('User with this email already exists')
    }

    // Check if employee ID is unique
    const existingEmployee = await prisma.nurseProfile.findUnique({
      where: { employeeId }
    })

    if (existingEmployee) {
      return apiError('Employee ID already exists')
    }

    const hashedPassword = await hashPassword(password)

    // Create user and nurse profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: hashedPassword,
          role: 'NURSE' as UserRole,
          hospitalId: (user as any).hospitalId
        }
      })

      const nurseProfile = await tx.nurseProfile.create({
        data: {
          userId: newUser.id,
          employeeId,
          hireDate: hireDate ? new Date(hireDate) : new Date(),
          seniorityLevel: seniorityLevel || 1,
          shiftTypes: shiftTypes || ['DAY'] as ShiftType[],
          qualifications: qualifications || [],
          contractHoursPerWeek: contractHoursPerWeek || 40,
          maxShiftsPerBlock: maxShiftsPerBlock || 12
        }
      })

      return { ...newUser, nurseProfile }
    })

    return apiSuccess(result, 'Nurse created successfully')
  } catch (error: any) {
    console.error('Failed to create nurse:', error)
    return apiError(error.message || 'Failed to create nurse', 500)
  }
}