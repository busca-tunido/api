import { PartialType } from '@nestjs/swagger';
import { CreatePensionDto } from './create-pension.dto.js';

export class UpdatePensionDto extends PartialType(CreatePensionDto) {}
