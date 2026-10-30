export interface AuthenticationUser {
  userCode: string;
  profileCode: string;
  name?: string;
  email?: string;
  createdAt?: string;
}

export interface AuthenticationResponse {
  token: string;
  refreshToken: string;
  user: AuthenticationUser;
  authenticationType?: {
    code: AuthenticationTypeCode;
    name: string;
  };
}

export type AuthenticationTypeCode = 'USER' | 'GOOGLE' | 'MICROSOFT';

export interface AuthenticationType {
  id: number;
  code: AuthenticationTypeCode;
  name: string;
}

export interface StoredUserProfile {
  userCode: string;
  profileCode: string;
  firstName?: string | null;
  secondName?: string | null;
  firstSurname?: string | null;
  secondSurname?: string | null;
  email: string;
  phone?: string[];
  photo?: string | null;
  dateBirth?: string | null;
  createdAt?: string | null;
  fullName: string;
}

export interface SignupRequest {
  firstName: string;
  secondName?: string;
  firstSurname: string;
  secondSurname?: string;
  dateBirth: string;
  email: string;
  phone: string[];
  username: string;
  password: string;
}
