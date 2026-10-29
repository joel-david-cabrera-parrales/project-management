import { IsString, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class EmailNotificationsDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  newMember?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  taskAssigned?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  taskCompleted?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  commentMentioned?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  dailyDigest?: boolean;
}

class InAppNotificationsDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  newMember?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  taskAssigned?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  taskCompleted?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  commentMentioned?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  memberRemoved?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  workspaceInvitation?: boolean;
}

class NotificationsDto {
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationsDto)
  email?: EmailNotificationsDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => InAppNotificationsDto)
  inApp?: InAppNotificationsDto;
}

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ enum: ['light', 'dark'] })
  theme?: 'light' | 'dark';

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ enum: ['es', 'en'] })
  language?: 'es' | 'en';

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;
}
