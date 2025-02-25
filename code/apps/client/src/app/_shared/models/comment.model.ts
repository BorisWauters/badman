import { Player } from './player.model';

export class Comment {
  id?: string;
  message?: string;
  player?: Player;
  clubId?: string;
  linkId?: string;
  linkType?: string;

  constructor(args: Partial<Comment>) {
    this.id = args?.id;
    this.message = args?.message ?? '';
    this.player = args?.player != null ? new Player(args?.player) : undefined;
    this.clubId = args?.clubId;
    this.linkId = args?.linkId;
    this.linkType = args?.linkType;
  }
}
