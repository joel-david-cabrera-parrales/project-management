import { UserProfile } from '../entities/auth.entity';

export interface MicrosoftUserProfile {
  microsoftId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

export abstract class AuthenticateWithMicrosoftUseCase {
  abstract execute(profile: MicrosoftUserProfile): Promise<UserProfile>;
}
