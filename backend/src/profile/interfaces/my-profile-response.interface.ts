export interface MyProfileResponse {
  userCode: string;
  profileCode: string;
  authenticationType: {
    code: string;
    name: string;
  };
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  email: string;
  phone: string[];
  photo: string | null;
  dateBirth: Date;
  createdAt: Date;
  fullName: string;
}
