import { NextResponse } from 'next/server'

export function apiResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T>(data: T, message?: string) {
  return NextResponse.json({
    data,
    success: true,
    ...(message && { message })
  })
}