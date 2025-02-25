import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import {
  GamePlayersResolver,
  PlayersResolver,
  TeamPlayerResolver,
} from './player.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [PlayersResolver, GamePlayersResolver, TeamPlayerResolver],
})
export class PlayerModule {}
