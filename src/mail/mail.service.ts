import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@ecommerce.com',
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Our E-Commerce Store!</h2>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Verify Email Address
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
            <p>Your verification token: <strong>${token}</strong></p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you didn't create an account, please ignore this email.
            </p>
          </div>
        `,
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@ecommerce.com',
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Reset Password
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; word-break: break-all;">${resetUrl}</p>
            <p>Your reset token: <strong>${token}</strong></p>
            <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you didn't request a password reset, please ignore this email.
            </p>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  async sendOtpEmail(to: string, otp: string) {
    const html = `
      <p>Hello,</p>
      <p>Your password reset code is:</p>
      <h2>${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is ${otp}`,
      html,
    });

    this.logger.log(`OTP email sent to ${to}`);
  }
}