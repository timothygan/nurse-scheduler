import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/utils'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function GET() {
  try {
    await requireAuth()
    
    const hospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        timezone: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            schedulingBlocks: true
          }
        }
      }
    })

    return apiSuccess(hospitals)
  } catch (error: any) {
    console.error('Failed to fetch hospitals:', error)
    return apiError(error.message || 'Failed to fetch hospitals', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { name, timezone = 'America/New_York' } = body

    if (!name) {
      return apiError('Hospital name is required')
    }

    const hospital = await prisma.hospital.create({
      data: {
        name,
        timezone
      }
    })

    return apiSuccess(hospital, 'Hospital created successfully')
  } catch (error: any) {
    console.error('Failed to create hospital:', error)
    return apiError(error.message || 'Failed to create hospital', 500)
  }
}