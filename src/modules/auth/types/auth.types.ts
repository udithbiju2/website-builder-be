import type { AuthTokens } from "../../../common/utils/cookies.js";
import type { UserRole, UserStatus } from "../../../common/constants/roles.js";

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  client: { id: string; businessName: string } | null;
  createdAt: string;
};

export type AuthResult = {
  user: PublicUser;
  tokens: AuthTokens;
  remember: boolean;
};

export type SignupInput = {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
  phone?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  remember: boolean;
};

export type VerificationDispatch = {
  email: string;
  emailSent: boolean;
  resendAvailableInSeconds: number;
};
