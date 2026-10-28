export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

interface User {
  userCode: string;
  profileCode: string;
}
