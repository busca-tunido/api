import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'juan.perez@alumnos.uchile.cl' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'ContrasenaSegura123!' })
  @IsString()
  password!: string;
}
