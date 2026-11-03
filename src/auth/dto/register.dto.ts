import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'juan.perez@alumnos.uchile.cl', maxLength: 100 })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(100, { message: 'El correo electrónico no puede superar los 100 caracteres' })
  email!: string;

  @ApiProperty({ example: 'ContrasenaSegura123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres' })
  password!: string;

  @ApiProperty({
    example: 'Juan',
    minLength: 2,
    maxLength: 40,
    pattern: "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s'-]+$",
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(40, { message: 'El nombre no puede superar los 40 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, {
    message: 'El nombre solo debe contener letras',
  })
  firstName!: string;

  @ApiProperty({
    example: 'Pérez',
    minLength: 2,
    maxLength: 40,
    pattern: "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s'-]+$",
  })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(40, { message: 'El apellido no puede superar los 40 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, {
    message: 'El apellido solo debe contener letras',
  })
  lastName!: string;

  @ApiPropertyOptional({
    example: '+56912345678',
    maxLength: 16,
    pattern: '^(\\+?56)?\\s?0?9\\s?[0-9]{4}\\s?[0-9]{4}$|^(\\+?56)?\\s?0?9\\s?[0-9]{8}$',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16, { message: 'El teléfono no puede superar los 16 caracteres' })
  @Matches(/^(\+?56)?\s?0?9\s?[0-9]{4}\s?[0-9]{4}$|^(\+?56)?\s?0?9\s?[0-9]{8}$/, {
    message: 'Formato de teléfono chileno inválido',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role', default: Role.STUDENT })
  @IsOptional()
  @IsIn([Role.STUDENT, Role.LANDLORD], {
    message: 'Role must be either STUDENT or LANDLORD',
  })
  role?: typeof Role.STUDENT | typeof Role.LANDLORD;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID()
  universityId?: string;
}
