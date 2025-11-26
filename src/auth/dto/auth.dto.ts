import { IsEmail, IsString, MinLength, IsOptional, MaxLength, Matches, IsNotEmpty } from 'class-validator';

// TODO: Consider creating separate DTOs for User and Admin registration
// to avoid sharing DTOs that may diverge in requirements

export class RegisterUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  // TODO: Add stronger password validation:
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  //   message: 'Password must contain uppercase, lowercase, number, and special character',
  // })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  // TODO: Add @Matches(/^[a-zA-Z\s'-]+$/) to prevent special characters
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;

  @IsOptional()
  @IsString()
  // TODO: Add phone number validation: @Matches(/^\+?[1-9]\d{1,14}$/) or use @IsPhoneNumber()
  phoneNumber?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsOptional()
  @IsString()
  // TODO: Add validation for 2FA code format (usually 6 digits)
  // @Matches(/^\d{6}$/, { message: '2FA code must be 6 digits' })
  twoFactorCode?: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  // TODO: Add password strength validation (same as RegisterUserDto)
  // TODO: Add custom validator to ensure newPassword !== currentPassword
  newPassword: string;
}