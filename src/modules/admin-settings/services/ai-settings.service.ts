import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import type { AiConfig } from "../../../generated/prisma/client.js";

const CONFIG_ID = "default";

export type AiConfigView = {
  configured: boolean;
  /** Masked, e.g. "sk-••••••••3f9a". The full key is never returned. */
  openaiApiKeyMasked: string | null;
  model: string;
  updatedAt: string | null;
};

export type UpdateAiConfigInput = {
  /** Omit or leave empty to keep the stored key. */
  openaiApiKey?: string;
  model: string;
};

function maskApiKey(key: string): string {
  const prefix = key.startsWith("sk-") ? "sk-" : "";
  return `${prefix}••••••••${key.slice(-4)}`;
}

function toView(config: AiConfig | null): AiConfigView {
  if (!config) {
    const envKey = env.OPENAI_API_KEY;
    const envModel = env.OPENAI_MODEL || "gpt-4o-mini";
    return {
      configured: Boolean(envKey),
      openaiApiKeyMasked: envKey ? maskApiKey(envKey) : null,
      model: envModel,
      updatedAt: null,
    };
  }

  const storedKey = config.openaiApiKeyCipher ? decryptSecret(config.openaiApiKeyCipher) : null;
  const activeKey = storedKey || env.OPENAI_API_KEY;

  return {
    configured: Boolean(activeKey),
    openaiApiKeyMasked: activeKey ? maskApiKey(activeKey) : null,
    model: config.model || env.OPENAI_MODEL || "gpt-4o-mini",
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null,
  };
}

export class AiSettingsService {
  async ensureTable(): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ai_config (
          id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
          "openaiApiKeyCipher" TEXT,
          model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
          "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);
    } catch {
      // Table already exists or handled by prisma
    }
  }

  async getConfigView(): Promise<AiConfigView> {
    await this.ensureTable();
    const config = await prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null);
    return toView(config);
  }

  async updateConfig(input: UpdateAiConfigInput): Promise<AiConfigView> {
    await this.ensureTable();
    const existing = await prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null);
    const newKey = input.openaiApiKey?.trim();
    const model = input.model?.trim() || "gpt-4o-mini";

    const data: { model: string; openaiApiKeyCipher?: string } = {
      model,
      ...(newKey ? { openaiApiKeyCipher: encryptSecret(newKey) } : {}),
    };

    const config = existing
      ? await prisma.aiConfig.update({ where: { id: CONFIG_ID }, data })
      : await prisma.aiConfig.create({
          data: {
            id: CONFIG_ID,
            openaiApiKeyCipher: newKey ? encryptSecret(newKey) : undefined,
            model,
          },
        });

    return toView(config);
  }

  async getCredentials(): Promise<{ apiKey: string; model: string }> {
    await this.ensureTable();
    const config = await prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } }).catch(() => null);
    const storedKey = config?.openaiApiKeyCipher ? decryptSecret(config.openaiApiKeyCipher) : null;
    const apiKey = storedKey || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
    const model = config?.model || env.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

    return { apiKey, model };
  }
}

export const aiSettingsService = new AiSettingsService();
