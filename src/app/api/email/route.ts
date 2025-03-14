import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * 创建一个邮件传输器
 * 这里使用的是一个测试账户，在实际应用中应该使用真实的SMTP服务
 */
const transporter = nodemailer.createTransport({
  service: 'QQ', // 使用QQ邮箱服务
  auth: {
    user: 'your-email@qq.com', // 替换为你的QQ邮箱
    pass: 'your-authorization-code' // 替换为你的授权码，不是QQ密码
  }
});

/**
 * API endpoint to send email
 * 
 * 使用Nodemailer发送邮件
 */
export async function POST(request: Request) {
  try {
    const { content, recipient, subject } = await request.json();
    
    // 验证必填字段
    if (!content || !recipient || !subject) {
      return NextResponse.json(
        { error: '缺少必填字段：内容、收件人和主题为必填项' },
        { status: 400 }
      );
    }
    
    // 由于我们没有真实的SMTP服务，这里我们只模拟发送
    // 在实际应用中，取消下面的注释并使用真实的SMTP服务
    /*
    const mailOptions = {
      from: 'your-email@qq.com', // 发件人地址
      to: recipient, // 收件人地址
      subject: subject, // 邮件主题
      html: content // HTML内容
    };
    
    // 发送邮件
    await transporter.sendMail(mailOptions);
    */
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('邮件发送请求:', {
      to: recipient,
      subject,
      contentLength: content.length
    });
    
    return NextResponse.json({ 
      success: true, 
      message: '邮件发送成功（模拟）',
      note: '注意：这是一个模拟的邮件发送。要发送真实邮件，请配置SMTP服务并取消代码中的注释。'
    });
  } catch (error) {
    console.error('发送邮件时出错:', error);
    return NextResponse.json(
      { error: '邮件发送失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
} 