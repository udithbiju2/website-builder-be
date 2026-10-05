import type { ClientSource, UserStatus } from "../../../common/constants/roles.js";

export type ClientOwner = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  emailVerified: boolean;
  lastSignedInAt: string | null;
};

export type ClientView = {
  id: string;
  businessName: string;
  address: string | null;
  source: ClientSource;
  createdAt: string;
  updatedAt: string;
  /** The client's login account. Null only if the user row was removed manually. */
  owner: ClientOwner | null;
};

export type ClientListQuery = {
  search?: string;
  source?: ClientSource;
  status?: UserStatus;
  page: number;
  pageSize: number;
};

export type ClientListResult = {
  items: ClientView[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClientDetailsInput = {
  businessName: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
};

export type CreateClientInput = ClientDetailsInput & {
  sendInvite: boolean;
};

export type CreateClientResult = {
  client: ClientView;
  /** Null when no invite was requested. */
  inviteSent: boolean | null;
};
