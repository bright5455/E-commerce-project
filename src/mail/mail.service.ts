import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.validateMailConfig();
    this.initializeTransporter();
    this.loadTemplates();
  }

 

  private validateMailConfig() {
    const requiredConfigs = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM'];
    const missingConfigs = requiredConfigs.filter(
      (config) => !this.configService.get<string>(config)
    );

    if (missingConfigs.length > 0) {
      this.logger.error(
        `Missing required mail configuration: ${missingConfigs.join(', ')}`
      );
      throw new Error(
        `Mail service initialization failed. Missing: ${missingConfigs.join(', ')}`
      );
    }
  }

  

  private initializeTransporter() {
    const port = this.configService.get<number>('MAIL_PORT') ?? 587;
    // Port 465 = implicit SSL (secure: true). Port 587/25 = STARTTLS (secure: false).
    const secureFromPort = port === 465;
    const mailSecure = this.configService.get<string>('MAIL_SECURE');
    const secure =
      mailSecure === 'true' || mailSecure === '1'
        ? true
        : mailSecure === 'false' || mailSecure === '0'
          ? false
          : secureFromPort;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port,
      secure,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
    });

    
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Mail transporter verification failed:', error);
      } else {
        this.logger.log('Mail service is ready to send emails');
      }
    });
  }

  private loadTemplates() {
    try {
      const templatesDir = path.join(process.cwd(), 'src', 'mail', 'templates');
      if (!fs.existsSync(templatesDir)) {
        this.logger.warn(
          `Templates directory not found: ${templatesDir}. Creating directory...`
        );
        fs.mkdirSync(templatesDir, { recursive: true });
        return;
      }

      const templateFiles = [
        'verification-email.hbs',
        'password-reset.hbs',
        'admin-verification.hbs',
        'otp-email.hbs',
      ];

      templateFiles.forEach((filename) => {
        const filePath = path.join(templatesDir, filename);
        if (fs.existsSync(filePath)) {
          const source = fs.readFileSync(filePath, 'utf-8');
          const template = handlebars.compile(source);
          const templateName = filename.replace('.hbs', '');
          this.templates.set(templateName, template);
          this.logger.log(`Loaded template: ${templateName}`);
        } else {
          this.logger.warn(`Template file not found: ${filename}`);
        }
      });

      this.registerHandlebarsHelpers();
    } catch (error) {
      this.logger.error('Failed to load email templates:', error);
    }
  }

  private registerHandlebarsHelpers() {
    handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });
  }

  private async sendMail(options: nodemailer.SendMailOptions) {
    try {
      const result = await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        ...options,
      });
      this.logger.log(`Email sent successfully to ${options.to}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }


  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const template = this.templates.get('verification-email');
    const html = template
      ? template({ verificationUrl, email })
      : this.getDefaultVerificationTemplate(verificationUrl);

    await this.sendMail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
    });

    this.logger.log(`Verification email sent to ${email}`);
  }

  private getDefaultVerificationTemplate(verificationUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome!</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p style="color: #555; line-height: 1.6;">
            Thank you for registering! Please verify your email address to activate your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #777; font-size: 14px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #4CAF50; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't create an account, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
        </div>
      </div>
    `;
  }


  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const template = this.templates.get('password-reset');
    const html = template
      ? template({ resetUrl, email })
      : this.getDefaultPasswordResetTemplate(resetUrl);

    await this.sendMail({
      to: email,
      subject: 'Reset Your Password',
      html,
    });

    this.logger.log(`Password reset email sent to ${email}`);
  }

  private getDefaultPasswordResetTemplate(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f44336; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p style="color: #555; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 15px 30px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #777; font-size: 14px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #f44336; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
        </div>
      </div>
    `;
  }


  async sendAdminVerificationEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/admin/verify-email?token=${token}`;

    const template = this.templates.get('admin-verification');
    const html = template
      ? template({ verificationUrl, email })
      : this.getDefaultAdminVerificationTemplate(verificationUrl);

    await this.sendMail({
      to: email,
      subject: 'Admin Account Verification',
      html,
    });

    this.logger.log(`Admin verification email sent to ${email}`);
  }

  private getDefaultAdminVerificationTemplate(verificationUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2196F3; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🛡️ Admin Access</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
          <h2 style="color: #333;">Welcome, Administrator!</h2>
          <p style="color: #555; line-height: 1.6;">
            You have been granted administrator access. Please verify your email address to activate your admin account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 15px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Admin Account
            </a>
          </div>
          <p style="color: #777; font-size: 14px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #2196F3; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <p style="color: #1565c0; margin: 0; font-size: 14px;">
              <strong>🔐 Important:</strong> As an administrator, you have elevated privileges. Please keep your credentials secure.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request admin access, please contact the system administrator immediately.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  async sendOtpEmail(email: string, otp: string) {
    const template = this.templates.get('otp-email');
    const html = template
      ? template({ otp, email })
      : this.getDefaultOtpTemplate(otp);

    await this.sendMail({
      to: email,
      subject: 'Your Verification Code',
      html,
    });

    this.logger.log(`OTP email sent to ${email}`);
  }

  private getDefaultOtpTemplate(otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #9C27B0; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔑 Verification Code</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
          <h2 style="color: #333;">Your Verification Code</h2>
          <p style="color: #555; line-height: 1.6;">
            Use the code below to complete your verification:
          </p>
          <div style="text-align: center; margin: 30px 0; background-color: #f3e5f5; padding: 20px; border-radius: 8px;">
            <h1 style="color: #9C27B0; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
              ${otp}
            </h1>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⏰ Important:</strong> This code will expire in 10 minutes.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
        </div>
      </div>
    `;
  }


  async sendTestEmail(to: string) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('Test emails are not allowed in production');
    }

    await this.sendMail({
      to,
      subject: 'Test Email from Mail Service',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Mail Service Test</h2>
          <p>This is a test email. Your mail service is configured correctly!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    this.logger.log(`Test email sent to ${to}`);
  }
}