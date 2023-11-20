import { ApiProperty } from '@nestjs/swagger';
import { SuccessEntity } from './success.entity';

export class CollectionEntity<T>
  extends SuccessEntity<T>
  implements Collection<T>
{
  @ApiProperty({ isArray: true })
  data: T[];

  constructor(collection: T[]) {
    super(collection);
  }
}
