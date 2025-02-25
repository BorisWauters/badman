import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { LocationResolver } from './location.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [LocationResolver],
})
export class LocationModule {}
