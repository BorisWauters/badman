import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A AvailiblyDay' })
export class AvailiblyDayType {
  @Field({ nullable: true })
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  @Field({ nullable: true })
  startTime: string;
  @Field({ nullable: true })
  endTime: string;
  @Field({ nullable: true })
  courts: number;
}

@InputType({ description: 'A AvailiblyDay' })
export class AvailiblyDayInputType {
  @Field({ nullable: true })
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  @Field({ nullable: true })
  startTime: string;
  @Field({ nullable: true })
  endTime: string;
  @Field({ nullable: true })
  courts: number;
}
