import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { id: blockId } = await params

    // Fetch scheduling block details
    const schedulingBlock = await prisma.schedulingBlock.findFirst({
      where: {
        id: blockId,
        hospitalId: user.hospitalId // Ensure user can only access their hospital's blocks
      },
      include: {
        hospital: {
          select: { name: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    if (!schedulingBlock) {
      return NextResponse.json({ 
        error: 'Scheduling block not found or access denied' 
      }, { status: 404 })
    }

    const blockData = {
      id: schedulingBlock.id,
      name: schedulingBlock.name,
      startDate: schedulingBlock.startDate.toISOString(),
      endDate: schedulingBlock.endDate.toISOString(),
      status: schedulingBlock.status,
      rules: schedulingBlock.rules,
      hospital: schedulingBlock.hospital.name,
      createdBy: `${schedulingBlock.createdBy.firstName} ${schedulingBlock.createdBy.lastName}`,
      createdAt: schedulingBlock.createdAt.toISOString(),
      updatedAt: schedulingBlock.updatedAt.toISOString()
    }

    return NextResponse.json({ block: blockData })

  } catch (error) {
    console.error('Error fetching scheduling block:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduling block' },
      { status: 500 }
    )
  }
}