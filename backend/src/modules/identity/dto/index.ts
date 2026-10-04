import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Matches } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "Must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsString({ message: "Password must be a string" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(128, { message: "Password must not exceed 128 characters" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: "Must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  deviceIdentifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceType?: string;
}

export class VerifyEmailDto {
  @IsString({ message: "Token must be a string" })
  @IsNotEmpty({ message: "Verification token is required" })
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: "Must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;
}

export class RequestPasswordResetDto {
  @IsEmail({}, { message: "Must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;
}

export class ResetPasswordDto {
  @IsString({ message: "Token must be a string" })
  @IsNotEmpty({ message: "Reset token is required" })
  token!: string;

  @IsString({ message: "Password must be a string" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(128, { message: "Password must not exceed 128 characters" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  newPassword!: string;
}

export class UpdateStatusDto {
  @IsString()
  @Matches(/^(active|suspended|deactivated)$/, {
    message: "Status must be active, suspended, or deactivated",
  })
  status!: "active" | "suspended" | "deactivated";
}

export class UpdateRoleDto {
  @IsString()
  @Matches(/^(customer|media_team|admin)$/, {
    message: "Role must be customer, media_team, or admin",
  })
  role!: "customer" | "media_team" | "admin";
}

export class GrantCapabilityDto {
  @IsString()
  @IsNotEmpty()
  capability!: string;
}

export class LinkGoogleDto {
  @IsString({ message: "Authorization code must be a string" })
  @IsNotEmpty({ message: "Authorization code is required" })
  code!: string;

  @IsString({ message: "State must be a string" })
  @IsNotEmpty({ message: "State is required" })
  state!: string;
}
