import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Boolean(process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.FROM_EMAIL || `no-reply@${(process.env.APP_DOMAIN || "example.com")}`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info;
}

export function otpEmailTemplate({ name, otp, appName = process.env.APP_NAME || "Our App" }) {
  const text = `Hi ${name},\n\nYour ${appName} verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2>${appName} Email Verification</h2>
      <p>Hi ${name},</p>
      <p>Your verification code is:</p>
      <div style="font-size:28px;font-weight:bold;letter-spacing:4px">${otp}</div>
      <p style="color:#555">This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>`;
  return { text, html };
}
