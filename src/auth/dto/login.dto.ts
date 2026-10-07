import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'juan.perez@alumnos.uchile.cl' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'ContrasenaSegura123!' })
  @IsString()
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ example: 'turnstile-token-sample' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
