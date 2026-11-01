import { Controller, Get, Patch, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  findMe(@GetUser() user: AuthenticatedUserDto) {
    return this.profileService.findMe(user.code);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@GetUser() user: AuthenticatedUserDto, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMe(user.code, dto);
  }

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed. Allowed: JPEG, PNG, WebP, GIF`), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile photo updated' })
  uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: AuthenticatedUserDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.profileService.uploadPhoto(file, user.code);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get current user settings' })
  getSettings(@GetUser() user: AuthenticatedUserDto) {
    return this.profileService.getSettings(user.code);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update current user settings (deep merge)' })
  updateSettings(@GetUser() user: AuthenticatedUserDto, @Body() dto: UpdateSettingsDto) {
    return this.profileService.updateSettings(user.code, dto);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get profile by code' })
  findOne(@Param('code') code: string) {
    return this.profileService.findOne(code);
  }
}
