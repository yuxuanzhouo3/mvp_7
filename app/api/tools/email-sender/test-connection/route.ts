import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { host, port, user, pass } = body

    if (!host || !user || !pass) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: host, user, pass' },
        { status: 400 }
      )
    }

    const numericPort = Number(port) || 465

    const transporter = nodemailer.createTransport({
      host,
      port: numericPort,
      secure: numericPort === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    })

    await transporter.verify()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[smtp-test] error:', error)

    const code = String(error?.code || '').toUpperCase()
    const message = String(error?.message || '').toLowerCase()

    const isTimeout =
      code === 'ETIMEDOUT' ||
      code === 'ESOCKET' ||
      message.includes('timed out') ||
      message.includes('connect etimedout')

    const isAuth =
      code === 'EAUTH' ||
      message.includes('invalid login') ||
      message.includes('authentication') ||
      message.includes('credentials')

    let userMessage: string
    if (isTimeout) {
      userMessage = 'SMTP server unreachable or port blocked. Check host/port and firewall settings.'
    } else if (isAuth) {
      userMessage = 'Authentication failed. Check your email and app password / authorization code.'
    } else {
      userMessage = error.message || 'Connection failed'
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        errorCode: isTimeout ? 'TIMEOUT' : isAuth ? 'AUTH' : 'OTHER',
      },
      { status: 200 } // Return 200 so frontend can parse the error
    )
  }
}
