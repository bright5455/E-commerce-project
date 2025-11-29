import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

// TODO: Create separate response DTOs for serialization
// Example: UserProfileResponseDto, AdminProfileResponseDto
// Use @Expose() decorator with class-transformer for whitelist approach

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @IsOptional()
  @IsString()
  // TODO: Add phone validation: @Matches(/^\+?[1-9]\d{1,14}$/)
  phoneNumber?: string;
}
