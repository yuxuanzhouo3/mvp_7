
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

    // 1. 创建 Transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number(smtpConfig.port),
      secure: Number(smtpConfig.port) === 465, // 465 为 true, 其他通常为 false (starttls)
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    // 2. 验证 SMTP 连接是否正常
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      console.error('SMTP Connection Failed:', verifyError);
      return NextResponse.json(
        { success: false, error: `SMTP Connection Failed: ${verifyError.message}` },
        { status: 401 }
      );
    }

    // 3. 发送邮件
    const info = await transporter.sendMail({
      from: `"${mailOptions.fromName || smtpConfig.user}" <${smtpConfig.user}>`, // 格式: "Name" <email@example.com>
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html, // 使用 html 格式支持富文本
      // text: mailOptions.text // 可选: 添加纯文本版本
    });

    console.log('Message sent: %s', info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
