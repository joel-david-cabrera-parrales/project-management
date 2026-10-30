import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticationTypesService } from './authentication-types.service';

@ApiTags('common')
@Controller('common/authentication-types')
export class AuthenticationTypesController {
  constructor(private readonly authenticationTypesService: AuthenticationTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener los tipos de autenticación disponibles' })
  findAll() {
    return this.authenticationTypesService.findAll();
  }
}
