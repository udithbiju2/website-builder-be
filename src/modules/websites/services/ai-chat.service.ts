import { prisma } from "../../../config/prisma.js";
import { type AuthUser } from "../../../common/middleware/authenticate.js";
import { websiteService } from "./website.service.js";

export type SaveChatSessionInput = {
  id?: string;
  title: string;
  messages: unknown[];
};

export class AiChatService {
  async listSessions(websiteId: string, user: AuthUser) {
    await websiteService.get(websiteId, user);
    const sessions = await prisma.aiChatSession.findMany({
      where: { websiteId },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      timestamp: s.updatedAt.getTime(),
      messages: s.messages,
    }));
  }

  async saveSession(websiteId: string, input: SaveChatSessionInput, user: AuthUser) {
    await websiteService.get(websiteId, user);
    const { id, title, messages } = input;

    if (id) {
      const existing = await prisma.aiChatSession.findFirst({
        where: { id, websiteId },
      });
      if (existing) {
        return prisma.aiChatSession.update({
          where: { id },
          data: {
            title: title || existing.title,
            messages: messages as any,
            userId: user.id,
          },
        });
      }
    }

    return prisma.aiChatSession.create({
      data: {
        id: id || undefined,
        websiteId,
        userId: user.id,
        title: title || "New Chat",
        messages: messages as any,
      },
    });
  }

  async deleteSession(websiteId: string, sessionId: string, user: AuthUser) {
    await websiteService.get(websiteId, user);
    await prisma.aiChatSession.deleteMany({
      where: { id: sessionId, websiteId },
    });
  }

  async clearSessions(websiteId: string, user: AuthUser) {
    await websiteService.get(websiteId, user);
    await prisma.aiChatSession.deleteMany({
      where: { websiteId },
    });
  }
}

export const aiChatService = new AiChatService();
