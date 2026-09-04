import { PartialType } from '@nestjs/swagger';
import { CreateUniversityDto } from './create-university.dto.js';

export class UpdateUniversityDto extends PartialType(CreateUniversityDto) {}
