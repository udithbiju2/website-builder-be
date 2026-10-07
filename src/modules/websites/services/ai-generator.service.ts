import { env } from "../../../config/env.js";
import { AppError } from "../../../common/errors/AppError.js";
import crypto from "crypto";

export type AiGenerateScope = "section" | "page";

export type SectionEnvelope = {
  id: string;
  type: string;
  hidden: boolean;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
};

export type AiSuggestionPayload = {
  id: string;
  prompt: string;
  summary: string;
  target:
    | { scope: "section"; sectionId: string }
    | { scope: "section_add"; sectionType: string }
    | { scope: "page" };
  before: SectionEnvelope[];
  after: SectionEnvelope[];
};

export type GenerateAiOptions = {
  prompt: string;
  scope: AiGenerateScope;
  sectionId?: string;
  currentSection?: SectionEnvelope;
  currentSections?: SectionEnvelope[];
};

const COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  darkred: "#991b1b",
  lightred: "#f87171",
  blue: "#2563eb",
  darkblue: "#1e3a8a",
  lightblue: "#60a5fa",
  green: "#16a34a",
  darkgreen: "#14532d",
  emerald: "#059669",
  teal: "#0d9488",
  cyan: "#0891b2",
  purple: "#9333ea",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  pink: "#db2777",
  yellow: "#ca8a04",
  orange: "#ea580c",
  amber: "#d97706",
  black: "#000000",
  white: "#ffffff",
  gray: "#4b5563",
  darkgray: "#1f2937",
  slate: "#0f172a",
  zinc: "#18181b",
};

export function sanitizeHexColor(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const cleanKey = trimmed.replace(/[^a-z]/g, "");
  return COLOR_MAP[cleanKey];
}

export function sanitizeSectionSettings(rawSettings: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    background: "default",
    hideOnMobile: false,
    spacing: "default",
    align: "center",
    ...rawSettings,
  };

  const validBackgrounds = ["default", "surface", "primary", "dark"];
  if (typeof result.background === "string") {
    if (!validBackgrounds.includes(result.background)) {
      const hex = sanitizeHexColor(result.background);
      if (hex) {
        const existingCustom =
          typeof result.customColors === "object" && result.customColors !== null
            ? (result.customColors as Record<string, unknown>)
            : {};
        result.customColors = {
          ...existingCustom,
          background: hex,
        };
      }
      result.background = "default";
    }
  } else {
    result.background = "default";
  }

  // Clean customColors
  if (typeof result.customColors === "object" && result.customColors !== null) {
    const rawCustom = result.customColors as Record<string, unknown>;
    const cleanCustom: Record<string, string> = {};
    for (const key of ["background", "text", "primary", "muted", "border"] as const) {
      const hex = sanitizeHexColor(rawCustom[key]);
      if (hex) {
        cleanCustom[key] = hex;
      }
    }
    result.customColors = Object.keys(cleanCustom).length > 0 ? cleanCustom : undefined;
  } else {
    delete result.customColors;
  }

  return result;
}

const SECTION_SCHEMAS_GUIDE = `
VALID SECTION SCHEMAS & EXACT FIELD KEYS:
1. "hero":
   data: {
     "variant": "background-image"|"centered"|"split"|"split-left"|"gradient"|"soft-card"|"floating-cards"|"asymmetric",
     "heading": "...",
     "highlightText": "...",
     "subheading": "...",
     "description": "...",
     "eyebrow": "...",
     "badgeIcon": "...",
     "primaryCta": { "label": "Get Started", "href": "/contact" },
     "secondaryCta": { "label": "Learn More", "href": "#features" },
     "image": { "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", "alt": "Product preview" },
     "backgroundImage": { "url": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=80", "alt": "Hero Background" },
     "imagePosition": "background"|"right"|"left"|"bottom"|"card",
     "bgImagePosition": "cover"|"center"|"top"|"bottom",
     "bgOverlayType": "dark"|"gradient"|"light"|"none",
     "overlayOpacity": 50,
     "overlayBlur": false,
     "minHeight": "screen"|"tall"|"compact"|"auto",
     "contentAlign": "center"|"left"|"right"
   }
   NOTE FOR HERO BACKGROUND IMAGES:
   - When asked to add a background image or fully covered dummy image to Hero:
     Set "backgroundImage": { "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80", "alt": "Hero background" }
     Set "imagePosition": "background"
     Set "variant": "background-image"
     Set "bgImagePosition": "cover"
     Set "bgOverlayType": "dark"
     Set "overlayOpacity": 50
     Set "minHeight": "screen"
2. "features":
   data: { "variant": "pastel-icons"|"cards-grid", "heading": "...", "intro": "...", "columns": 3, "items": [ { "icon": "bolt"|"star"|"shield"|"rocket"|"layers"|"sparkles"|"check", "iconColor": "orange"|"green"|"yellow"|"cyan"|"purple", "title": "...", "description": "...", "badge": "..." } ] }
3. "services":
   data: { "variant": "cards-grid", "heading": "...", "intro": "...", "columns": 3, "items": [ { "title": "...", "description": "...", "badge": "...", "features": ["..."] } ] }
4. "stats":
   data: { "variant": "card-grid", "heading": "...", "columns": 4, "items": [ { "value": "99.9%", "label": "...", "description": "..." } ] }
5. "pricing":
   data: { "variant": "cards", "heading": "...", "intro": "...", "tiers": [ { "name": "...", "price": "$29", "interval": "/mo", "description": "...", "badge": "Popular", "highlighted": true, "features": ["..."], "button": { "label": "Get started", "href": "/contact" } } ] }
6. "testimonials":
   data: { "variant": "grid", "heading": "...", "intro": "...", "columns": 3, "items": [ { "quote": "...", "name": "...", "role": "...", "rating": 5, "avatar": { "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80", "alt": "Avatar" } } ] }
7. "team":
   data: { "variant": "grid", "heading": "...", "intro": "...", "columns": 4, "members": [ { "name": "...", "role": "...", "bio": "...", "avatar": { "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", "alt": "Team Member" } } ] }
8. "marquee":
   data: { "variant": "gradient-pill", "speed": "normal", "direction": "left", "items": [ { "text": "...", "badge": "..." } ] }
9. "carousel":
   data: { "variant": "hero-slider", "autoplay": true, "slides": [ { "title": "...", "subtitle": "...", "description": "..." } ] }
10. "faq":
   data: { "variant": "accordion", "heading": "...", "intro": "...", "items": [ { "question": "...", "answer": "..." } ] }
11. "cta":
   data: { "variant": "centered-card"|"split-visual"|"floating-card"|"minimal-editorial", "heading": "...", "text": "...", "button": { "label": "Get started", "href": "/contact" } }
12. "header":
   data: { "design": "logo-left"|"centered"|"classical"|"minimalist"|"floating", "siteName": "...", "menu": [ { "label": "Home", "href": "/" }, { "label": "About", "href": "/about" } ], "sticky": false }
   settings: { "customColors": { "background": "#rrggbb" } }

STOCK / DUMMY IMAGE GUIDELINES:
- Whenever user asks for dummy images, stock photos, background images, product preview, mockups, or avatars:
  ALWAYS use high-quality Unsplash image URLs:
  - Tech / Abstract / Modern Dark Hero: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80"
  - Interior / Living / Space: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
  - Vibrant Gradient / Mesh: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=80"
  - SaaS Dashboard / Analytics: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
  - Avatars / Team: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
`;

const SYSTEM_PROMPT_ADD_SECTION = `You are a world-class AI website copywriter and UI designer.
Your job is to generate a single brand new, pixel-perfect website section based on user instructions.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences.
2. Provide rich, highly converting, realistic copy. Never use placeholder text.
${SECTION_SCHEMAS_GUIDE}
3. Output format must be:
{
  "summary": "Brief 1-sentence summary of the new section created",
  "type": "hero"|"features"|"services"|"pricing"|"testimonials"|"faq"|"cta"|"team"|"marquee"|"carousel"|"stats",
  "settings": { "background": "default", "hideOnMobile": false, "spacing": "default" },
  "data": { ... }
}`;

const SYSTEM_PROMPT_SECTION_EDIT = `You are a world-class AI website copywriter and UI designer for a modern 2026 website builder.
Your job is to update content, images, background media, or styling for an existing single website section based on user instructions.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences, conforming strictly to the requested schema.
2. Provide compelling, conversion-focused, modern copy. Do NOT use placeholder text.
3. SECTION SETTINGS & COLOR RULES:
   - "settings.background" MUST only be one of: "default", "surface", "primary", "dark".
   - If the user specifies a specific custom color (e.g. "red", "purple", "navy", "green", "black"), put it in "settings.customColors.background" as a valid 6-digit hex string (e.g. "#dc2626", "#7c3aed", "#0f172a", "#16a34a", "#000000").
4. BACKGROUND IMAGES & DUMMY IMAGES:
   - If the user asks to add a background image, cover image, or dummy image to this section, supply a valid Unsplash photo URL in "data.backgroundImage" (or "data.image"), and set appropriate "imagePosition": "background", "variant": "background-image", "bgImagePosition": "cover", "bgOverlayType": "dark", "overlayOpacity": 50.
${SECTION_SCHEMAS_GUIDE}
5. Output format must be:
{
  "summary": "Brief 1-sentence summary of what was changed",
  "data": { ...updated section data object... },
  "settings": {
    "background": "default"|"surface"|"primary"|"dark",
    "customColors": {
      "background": "#rrggbb",
      "text": "#rrggbb"
    }
  }
}`;

const SYSTEM_PROMPT_PAGE = `You are a world-class AI website designer and conversion copywriter for a modern 2026 website builder.
Your job is to generate or update page sections based strictly on the user's instructions.

${SECTION_SCHEMAS_GUIDE}

CRITICAL RULES:
1. When generating a fresh landing page, output 4 to 6 modern sections. Do NOT include "header" or "footer" in the array.
2. For "cta", "variant" MUST ONLY be one of: "centered-card", "split-visual", "floating-card", "minimal-editorial".
3. Output format:
{
  "summary": "Brief 1-sentence summary of the changes",
  "sections": [
    {
      "type": "hero",
      "settings": { "background": "default", "hideOnMobile": false, "spacing": "relaxed" },
      "data": { ... }
    },
    ...
  ]
}`;

const SECTION_KEYWORDS: Record<string, string> = {
  hero: "hero",
  banner: "hero",
  feature: "features",
  features: "features",
  service: "services",
  services: "services",
  pricing: "pricing",
  price: "pricing",
  plan: "pricing",
  plans: "pricing",
  testimonial: "testimonials",
  testimonials: "testimonials",
  review: "testimonials",
  reviews: "testimonials",
  faq: "faq",
  faqs: "faq",
  question: "faq",
  team: "team",
  members: "team",
  marquee: "marquee",
  ticker: "marquee",
  carousel: "carousel",
  slider: "carousel",
  slide: "carousel",
  cta: "cta",
  action: "cta",
  contact: "contact",
  stat: "stats",
  stats: "stats",
  numbers: "stats",
};

export class AiGeneratorService {
  private get apiKey(): string {
    const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new AppError(
        400,
        "OpenAI API key is not configured. Please add OPENAI_API_KEY in backend .env.",
      );
    }
    return key;
  }

  private get model(): string {
    return env.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  /**
   * Calls OpenAI Chat Completions API using native fetch.
   */
  private async callOpenAi(messages: { role: "system" | "user"; content: string }[], temperature = 0.7): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        response_format: { type: "json_object" },
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `OpenAI API returned status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch {
        // use default errorMsg
      }
      throw new AppError(502, `AI Generation Failed: ${errorMsg}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(502, "OpenAI returned an empty response");
    }

    return content;
  }

  /**
   * Generates AI suggestion for a single section, adding a section, or full page.
   */
  async generate(options: GenerateAiOptions): Promise<AiSuggestionPayload> {
    const { prompt, scope, sectionId, currentSection, currentSections = [] } = options;
    const lowerPrompt = prompt.toLowerCase().trim();

    // Check if user specifically intends to ADD a brand new section to the page
    const isExplicitAddSectionCommand =
      /\b(add|insert|create|append)\s+(a\s+|an\s+|new\s+)?(hero|features|services|pricing|testimonials|faq|cta|team|marquee|carousel|stats|contact)\b/i.test(lowerPrompt) ||
      /\b(add|insert|create|append)\s+(a\s+|an\s+|new\s+)?section\b/i.test(lowerPrompt) ||
      lowerPrompt.startsWith("add section") ||
      lowerPrompt.startsWith("new section");

    let requestedSectionType: string | null = null;
    for (const [kw, stype] of Object.entries(SECTION_KEYWORDS)) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(lowerPrompt)) {
        requestedSectionType = stype;
        break;
      }
    }

    // Determine if this should generate an entirely NEW section rather than editing the current section
    const isEditingCurrentSection =
      Boolean(currentSection) &&
      (scope === "section" || requestedSectionType === currentSection?.type || !isExplicitAddSectionCommand);

    const shouldAddSection =
      !isEditingCurrentSection &&
      ((isExplicitAddSectionCommand && Boolean(requestedSectionType)) ||
        (currentSection && requestedSectionType && requestedSectionType !== currentSection.type));

    if (shouldAddSection && requestedSectionType) {
      const userMessage = `Requested Section Type to Create: "${requestedSectionType}"
User Prompt: "${prompt}"

Please create a complete, stunning, high-converting "${requestedSectionType}" section JSON for this instruction.`;

      const rawAiResponse = await this.callOpenAi([
        { role: "system", content: SYSTEM_PROMPT_ADD_SECTION },
        { role: "user", content: userMessage },
      ]);

      let parsed: { summary?: string; type?: string; settings?: Record<string, unknown>; data?: Record<string, unknown> };
      try {
        parsed = JSON.parse(rawAiResponse);
      } catch {
        throw new AppError(502, "Failed to parse structured JSON response from AI.");
      }

      const finalType = parsed.type || requestedSectionType;
      const cleanSettings = sanitizeSectionSettings(parsed.settings || {});

      const newSection: SectionEnvelope = {
        id: crypto.randomUUID(),
        type: finalType,
        hidden: false,
        settings: cleanSettings,
        data: parsed.data || {},
      };

      return {
        id: crypto.randomUUID(),
        prompt,
        summary: parsed.summary || `Added new ${finalType} section`,
        target: { scope: "section_add", sectionType: finalType },
        before: [],
        after: [newSection],
      };
    }

    // SCENARIO 2: EDIT EXISTING SECTION IN PLACE
    const isTargetingHeader = lowerPrompt.includes("header") || lowerPrompt.includes("navbar") || lowerPrompt.includes("nav bar");
    const isTargetingFooter = lowerPrompt.includes("footer") || lowerPrompt.includes("copyright");

    if (scope === "section" || isEditingCurrentSection || (scope === "page" && currentSections.length > 0 && (isTargetingHeader || isTargetingFooter))) {
      let targetSection = currentSection;

      if (!targetSection && sectionId) {
        targetSection = currentSections.find((s) => s.id === sectionId);
      }

      if (!targetSection && isTargetingHeader) {
        targetSection = currentSections.find((s) => s.type === "header");
      }

      if (!targetSection && isTargetingFooter) {
        targetSection = currentSections.find((s) => s.type === "footer");
      }

      if (targetSection) {
        const userMessage = `Current Section Type: "${targetSection.type}"
Current Section Settings: ${JSON.stringify(targetSection.settings || {})}
Current Section Data: ${JSON.stringify(targetSection.data || {})}

User Instruction: "${prompt}"

Please modify this section data and settings to satisfy the user instruction. If changing color/background, use valid 6-digit hex in settings.customColors.`;

        const rawAiResponse = await this.callOpenAi([
          { role: "system", content: SYSTEM_PROMPT_SECTION_EDIT },
          { role: "user", content: userMessage },
        ]);

        let parsed: { summary?: string; data?: Record<string, unknown>; settings?: Record<string, unknown> };
        try {
          parsed = JSON.parse(rawAiResponse);
        } catch {
          throw new AppError(502, "Failed to parse structured JSON response from AI.");
        }

        const updatedData = {
          ...targetSection.data,
          ...(parsed.data || {}),
        };

        const rawMergedSettings = {
          ...targetSection.settings,
          ...(parsed.settings || {}),
        };

        const updatedSettings = sanitizeSectionSettings(rawMergedSettings);

        const afterSection: SectionEnvelope = {
          id: targetSection.id,
          type: targetSection.type,
          hidden: targetSection.hidden ?? false,
          settings: updatedSettings,
          data: updatedData,
        };

        return {
          id: crypto.randomUUID(),
          prompt,
          summary: parsed.summary || `Updated ${targetSection.type} section`,
          target: { scope: "section", sectionId: targetSection.id },
          before: [targetSection],
          after: [afterSection],
        };
      }
    }

    // SCENARIO 3: WHOLE PAGE GENERATION
    const userMessage = `User Website Goal / Prompt: "${prompt}"
Current Sections on Page: ${currentSections.map((s) => s.type).join(", ") || "None (Fresh Page)"}

Please generate a high-converting, complete landing page (4 to 6 rich sections) matching the prompt.`;

    const rawAiResponse = await this.callOpenAi([
      { role: "system", content: SYSTEM_PROMPT_PAGE },
      { role: "user", content: userMessage },
    ]);

    let parsed: { summary?: string; sections?: Array<{ type: string; settings?: Record<string, unknown>; data: Record<string, unknown> }> };
    try {
      parsed = JSON.parse(rawAiResponse);
    } catch {
      throw new AppError(502, "Failed to parse structured JSON response from AI.");
    }

    const generatedList = Array.isArray(parsed.sections) ? parsed.sections : [];
    if (generatedList.length === 0) {
      throw new AppError(502, "AI did not generate any page sections. Please try with a more specific prompt.");
    }

    const afterSections: SectionEnvelope[] = generatedList
      .filter((item) => item.type !== "header" && item.type !== "footer")
      .map((item) => ({
        id: crypto.randomUUID(),
        type: item.type || "features",
        hidden: false,
        settings: sanitizeSectionSettings(item.settings || {}),
        data: item.data || {},
      }));

    return {
      id: crypto.randomUUID(),
      prompt,
      summary: parsed.summary || "Generated new page layout and content",
      target: { scope: "page" },
      before: currentSections,
      after: afterSections,
    };
  }
}

export const aiGeneratorService = new AiGeneratorService();
