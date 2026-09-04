import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'juan.perez@alumnos.uchile.cl' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'ContrasenaSegura123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STUDENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID()
  universityId?: string;
}
