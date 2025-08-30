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

    // Get scheduling blocks that are OPEN for preference submission
    // and belong to the nurse's hospital
    const availableBlocks = await prisma.schedulingBlock.findMany({
      where: {
        hospitalId: user.hospitalId,
        status: 'OPEN'
      },
      include: {
        hospital: {
          select: { name: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        },
        nursePreferences: {
          where: {
            nurseId: user.id
          },
          select: {
            id: true,
            submittedAt: true,
            flexibilityScore: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    // Transform the data to include preference submission status
    const blocksWithStatus = availableBlocks.map(block => ({
      id: block.id,
      name: block.name,
      startDate: block.startDate,
      endDate: block.endDate,
      status: block.status,
      hospital: block.hospital.name,
      createdBy: `${block.createdBy.firstName} ${block.createdBy.lastName}`,
      hasSubmittedPreferences: block.nursePreferences.length > 0,
      submittedAt: block.nursePreferences[0]?.submittedAt || null,
      flexibilityScore: block.nursePreferences[0]?.flexibilityScore || null
    }))

    return NextResponse.json({ blocks: blocksWithStatus })

  } catch (error) {
    console.error('Error fetching available scheduling blocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduling blocks' },
      { status: 500 }
    )
  }
}