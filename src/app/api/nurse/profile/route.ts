import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'NURSE') {
      return NextResponse.json({ error: 'Only nurses can access this endpoint' }, { status: 403 })
    }

    // For now, return default profile data until we implement full nurse profiles
    // In a real app, you'd have a separate nurses table with qualifications
    const profileData = {
      id: user.id,
      employeeId: user.id.slice(-6), // Use last 6 chars of ID as employee ID
      hireDate: new Date().toISOString(),
      seniorityLevel: 1,
      shiftTypes: ['DAY', 'NIGHT'], // Default to both shifts
      qualifications: ['RN'],
      contractHoursPerWeek: 40,
      maxShiftsPerBlock: 15
    }

    return NextResponse.json({ profile: profileData })

  } catch (error) {
    console.error('Error fetching nurse profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nurse profile' },
      { status: 500 }
    )
  }
}