
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function isConnectionTimeoutError(error: any): boolean {
  const code = String(error?.code || '').toUpperCase()
  const command = String(error?.command || '').toUpperCase()
  const message = String(error?.message || '').toLowerCase()

  return (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    command === 'CONN' ||
    message.includes('timed out') ||
    message.includes('connect etimedout')
  )
}

function createTransporter(smtpConfig: any, port: number) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port,
    secure: port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 12000,
  })
}

async function verifyAndSendWithPort(port: number, smtpConfig: any, mailOptions: any) {
  const transporter = createTransporter(smtpConfig, port)
  await transporter.verify()
  return transporter.sendMail({
    from: `"${mailOptions.fromName || smtpConfig.user}" <${smtpConfig.user}>`,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { smtpConfig, mailOptions } = body;

    if (!smtpConfig || !mailOptions) {
      return NextResponse.json(
        { success: false, error: 'Missing configuration or mail options' },
        { status: 400 }
      );
    }

    const primaryPort = Number(smtpConfig.port)
    let info: any

    try {
      info = await verifyAndSendWithPort(primaryPort, smtpConfig, mailOptions)
    } catch (verifyError: any) {
      console.error('SMTP Connection Failed:', verifyError)
      return NextResponse.json(
        {
          success: false,
          errorCode: isConnectionTimeoutError(verifyError)
            ? 'SMTP_NETWORK_UNREACHABLE'
            : 'SMTP_AUTH_OR_CONFIG_ERROR',
          error: `SMTP Connection Failed: ${verifyError.message}`,
          userMessage: isConnectionTimeoutError(verifyError)
            ? 'SMTP 服务器网络不可达或端口被拦截，请检查当前端口出站连接。'
            : 'SMTP 认证或配置有误，请检查主机、端口、用户名和应用专用密码。',
        },
        { status: 401 }
      )
    }

    console.log('Message sent: %s', info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId, usedPort: primaryPort });

  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
