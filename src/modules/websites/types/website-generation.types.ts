import type { GenerationStatus } from "../../../generated/prisma/enums.js";
import type { CreateWebsiteInput } from "./website.types.js";

export const GENERATION_TONES = ["professional", "friendly", "luxury", "playful", "bold", "minimal"] as const;
export type GenerationTone = (typeof GENERATION_TONES)[number];

export const MAX_GENERATED_PAGES = 8;
export const MAX_BRIEF_IMAGES = 12;

/** What the client asked the AI for; stored as `website_generations.input`. */
export type GenerationBrief = {
  prompt: string;
  /** Page names in nav order; the first one becomes the home page. */
  pages: string[];
  tone: GenerationTone | null;
  /** A fixed theme; null lets the AI pick one and tune its colors. */
  themeId: string | null;
  /** Media library images the AI may place in sections. */
  mediaIds: string[];
  logoMediaId: string | null;
};

export type CreateAiWebsiteInput = Omit<CreateWebsiteInput, "templateKey" | "themeId"> & {
  prompt: string;
  pages: string[];
  tone?: GenerationTone;
  themeId?: string;
  mediaIds?: string[];
  logoMediaId?: string;
};

export type GenerationView = {
  status: GenerationStatus;
  step: string | null;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};
