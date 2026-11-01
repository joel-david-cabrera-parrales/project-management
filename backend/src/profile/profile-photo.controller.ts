import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Profile Photo')
@Controller('profile/photo')
export class ProfilePhotoController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Get profile photo file (public)' })
  async getPhoto(@Param('code') code: string, @Res() res: Response) {
    const { body, mimeType } = await this.profileService.getPhotoFile(code);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    body.pipe(res);
  }
}
