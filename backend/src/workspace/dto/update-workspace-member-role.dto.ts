import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateWorkspaceMemberRoleDto {
  @IsString()
  @IsIn(['member', 'viewer'])
  @ApiProperty({ enum: ['member', 'viewer'], example: 'member' })
  roleMember: 'member' | 'viewer';
}
