import { randomBytes } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { ClientSource, UserRole, UserStatus } from "../../../common/constants/roles.js";
import { hashPassword } from "../../../common/utils/hash.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { authService } from "../../auth/services/auth.service.js";
import { revokePasswordResetToken } from "../../auth/utils/password-reset.js";
import type {
  ClientDetailsInput,
  ClientListQuery,
  ClientListResult,
  ClientView,
  CreateClientInput,
  CreateClientResult,
} from "../types/client.types.js";

/** Each client workspace currently has a single login account: its earliest CLIENT user. */
const clientInclude = {
  users: {
    where: { role: UserRole.CLIENT },
    orderBy: { createdAt: "asc" },
    take: 1,
  },
} as const satisfies Prisma.ClientInclude;

type ClientWithOwner = Prisma.ClientGetPayload<{ include: typeof clientInclude }>;

const EMAIL_TAKEN = () => new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");
const NOT_FOUND = () => new AppError(404, "Client not found", "CLIENT_NOT_FOUND");

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toView(client: ClientWithOwner): ClientView {
  const owner = client.users[0];
  return {
    id: client.id,
    businessName: client.businessName,
    address: client.address,
    source: client.source,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    owner: owner
      ? {
          id: owner.id,
          fullName: owner.fullName,
          email: owner.email,
          phone: owner.phone,
          status: owner.status,
          emailVerified: owner.emailVerifiedAt !== null,
          lastSignedInAt: owner.lastSignedInAt?.toISOString() ?? null,
        }
      : null,
  };
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export class ClientService {
  async list(query: ClientListQuery): Promise<ClientListResult> {
    const search = query.search?.trim();
    const userFilter: Prisma.UserWhereInput = {
      role: UserRole.CLIENT,
      ...(query.status ? { status: query.status } : {}),
    };

    const where: Prisma.ClientWhereInput = {
      ...(query.source ? { source: query.source } : {}),
      ...(query.status ? { users: { some: userFilter } } : {}),
      ...(search
        ? {
            OR: [
              { businessName: { contains: search, mode: "insensitive" } },
              { users: { some: { ...userFilter, email: { contains: search, mode: "insensitive" } } } },
              { users: { some: { ...userFilter, fullName: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [total, clients] = await prisma.$transaction([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: clientInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items: clients.map(toView), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<ClientView> {
    return toView(await this.findOrThrow(id));
  }

  async create(input: CreateClientInput, actorId: string): Promise<CreateClientResult> {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw EMAIL_TAKEN();

    let client: ClientWithOwner;
    try {
      client = await prisma.client.create({
        data: {
          businessName: input.businessName.trim(),
          address: emptyToNull(input.address),
          source: ClientSource.ADMIN_CREATED,
          users: {
            create: {
              email,
              // Unusable random password until the client sets their own from the invite link.
              passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
              fullName: input.fullName.trim(),
              phone: emptyToNull(input.phone),
              role: UserRole.CLIENT,
              status: UserStatus.PENDING_VERIFICATION,
            },
          },
        },
        include: clientInclude,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw EMAIL_TAKEN();
      throw error;
    }
    logger.info({ clientId: client.id, actorId }, "Client created by Super Admin");

    const owner = client.users[0];
    const inviteSent = input.sendInvite && owner ? await authService.sendInvite(owner) : null;
    return { client: toView(client), inviteSent };
  }

  async update(id: string, input: ClientDetailsInput, actorId: string): Promise<ClientView> {
    const client = await this.findOrThrow(id);
    const owner = client.users[0];
    const email = input.email.toLowerCase();

    if (owner && email !== owner.email) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (taken) throw EMAIL_TAKEN();
    }

    try {
      await prisma.$transaction([
        prisma.client.update({
          where: { id },
          data: { businessName: input.businessName.trim(), address: emptyToNull(input.address) },
        }),
        ...(owner
          ? [
              prisma.user.update({
                where: { id: owner.id },
                data: { fullName: input.fullName.trim(), email, phone: emptyToNull(input.phone) },
              }),
            ]
          : []),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) throw EMAIL_TAKEN();
      throw error;
    }
    const emailChanged = owner !== undefined && email !== owner.email;
    if (emailChanged) await revokePasswordResetToken(owner.id);
    logger.info({ clientId: id, actorId, emailChanged }, "Client updated");
    return this.get(id);
  }

  /** Suspended clients can't log in, and every existing session is revoked immediately. */
  async suspend(id: string, actorId: string): Promise<ClientView> {
    const owner = this.requireOwner(await this.findOrThrow(id));
    if (owner.status === UserStatus.SUSPENDED) {
      throw new AppError(409, "This client is already suspended.", "ALREADY_SUSPENDED");
    }
    await prisma.user.update({ where: { id: owner.id }, data: { status: UserStatus.SUSPENDED } });
    await authService.revokeAllSessions(owner.id);
    logger.info({ clientId: id, actorId }, "Client suspended");
    return this.get(id);
  }

  /** Restores access; clients who never verified their email go back to pending verification. */
  async reactivate(id: string, actorId: string): Promise<ClientView> {
    const owner = this.requireOwner(await this.findOrThrow(id));
    if (owner.status !== UserStatus.SUSPENDED) {
      throw new AppError(409, "This client is not suspended.", "NOT_SUSPENDED");
    }
    await prisma.user.update({
      where: { id: owner.id },
      data: { status: owner.emailVerifiedAt ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION },
    });
    logger.info({ clientId: id, actorId }, "Client reactivated");
    return this.get(id);
  }

  /**
   * For pending clients: admin-created ones get a fresh set-password invite,
   * self-signup ones get a new verification code.
   */
  async resendEmail(id: string): Promise<{ emailSent: boolean }> {
    const client = await this.findOrThrow(id);
    const owner = this.requireOwner(client);
    if (owner.status !== UserStatus.PENDING_VERIFICATION) {
      throw new AppError(409, "This client has already verified their email.", "ALREADY_VERIFIED");
    }

    if (client.source === ClientSource.ADMIN_CREATED) {
      return { emailSent: await authService.sendInvite(owner) };
    }
    const dispatch = await authService.resendVerification(owner.email);
    return { emailSent: dispatch.emailSent };
  }

  private async findOrThrow(id: string): Promise<ClientWithOwner> {
    const client = await prisma.client.findUnique({ where: { id }, include: clientInclude });
    if (!client) throw NOT_FOUND();
    return client;
  }

  private requireOwner(client: ClientWithOwner) {
    const owner = client.users[0];
    if (!owner) throw new AppError(409, "This client has no login account.", "CLIENT_HAS_NO_USER");
    return owner;
  }
}

export const clientService = new ClientService();
