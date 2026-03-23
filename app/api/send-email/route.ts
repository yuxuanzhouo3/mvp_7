import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { smtpConfig, recipients, subject, content } = body

  return NextResponse.json({ 
    success: true, 
    message: 'Email sending simulated. In production, integrate with nodemailer or SendGrid.',
    total: recipients.length,
    sent: Math.floor(recipients.length * 0.9),
    failed: Math.floor(recipients.length * 0.1)
  })
}
