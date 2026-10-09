import {
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateMonthDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  templateIds!: string[];
}
