import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const campaigns = []
  
  return NextResponse.json(campaigns)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  return NextResponse.json({ success: true, campaignId: Date.now(), ...body })
}
