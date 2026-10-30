import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponse } from './user-response.response';

class AuthenticationTypeResponse {
  @ApiProperty({ example: 'USER' })
  code: string;

  @ApiProperty({ example: 'Usuario' })
  name: string;
}

export class loginResponse {
  @ApiProperty({
    type: 'string',
    description: 'Token de autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    type: 'string',
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({ type: UserResponse, description: 'Usuario autenticado' })
  user: UserResponse;

  @ApiPropertyOptional({ type: AuthenticationTypeResponse, description: 'Tipo de autenticación de la cuenta' })
  authenticationType?: { code: string; name: string };
}
