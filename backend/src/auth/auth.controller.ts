import { Controller, Post, Body, UseGuards, Get, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CredentialDto } from './dto/credential.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from './decorators/get-user.decorator';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfileCreatedResponse, loginResponse } from 'src/common/responses';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Registrar perfil de usuario' })
  @ApiResponse({ status: 201, description: 'Perfil de usuario registrado', type: ProfileCreatedResponse })
  @ApiResponse({ status: 400, description: 'Perfil de usuario ya registrado' })
  register(@Body() createAuthDto: CreateProfileDto) {
    return this.authService.registerProfile(createAuthDto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Autenticar usuario',
    description: 'Autentica un usuario con sus credenciales',
  })
  @ApiResponse({ status: 200, description: 'Usuario autenticado', type: loginResponse })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() authenticateCredentialDto: CredentialDto) {
    return this.authService.authenticate(authenticateCredentialDto);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(@GetUser() user: AuthenticatedUserDto, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.code, dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar autenticación con Google' })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  async googleCallback(@Req() req: any, @Res() res: any) {
    const user = await this.authService.findOrCreateByGoogle(req.user);
    const jwt = this.authService.generateJwt(user);
    const frontendUrl = this.configService.get('HOST_FRONTEND') || 'http://localhost:4200';
    return res.redirect(`${frontendUrl}/auth/callback?token=${jwt}`);
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Iniciar autenticación con Microsoft' })
  async microsoftAuth() {}

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Callback de Microsoft OAuth' })
  async microsoftCallback(@Req() req: any, @Res() res: any) {
    const user = await this.authService.authenticateWithMicrosoft(req.user);
    const jwt = this.authService.generateJwt(user);
    const frontendUrl = this.configService.get('HOST_FRONTEND') || 'http://localhost:4200';
    return res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(jwt)}`);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Enviar código de restablecimiento de contraseña' })
  @ApiResponse({ status: 201, description: 'Código de verificación enviado al correo' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendPasswordResetCode(dto);
  }

  @Post('verify-reset-code')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verificar código de restablecimiento de contraseña' })
  @ApiResponse({ status: 201, description: 'Código de verificación verificado' })
  @ApiResponse({ status: 400, description: 'Código inválido' })
  verifyResetCode(@Body() dto: { code: string }) {
    return this.authService.verifyResetCode(dto.code);
  }

  @Post('reset-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Restablecer contraseña' })
  @ApiResponse({ status: 201, description: 'Contraseña restablecida' })
  @ApiResponse({ status: 400, description: 'Código inválido' })
  resetPassword(@GetUser() user: AuthenticatedUserDto, @Body() dto: { password: string }) {
    return this.authService.resetPassword(user, dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 15 } })
  @ApiOperation({ summary: 'Refrescar token de autenticación' })
  @ApiResponse({ status: 200, description: 'Token refrescado', type: loginResponse })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  // @Post()
  // create(@Body() createAuthDto: CreateAuthDto) {
  //   return this.authService.create(createAuthDto);
  // }

  // @Get()
  // findAll() {
  //   return this.authService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.authService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
  //   return this.authService.update(+id, updateAuthDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.authService.remove(+id);
  // }
}
