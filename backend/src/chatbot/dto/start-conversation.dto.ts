import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  flowId?: string;
}
