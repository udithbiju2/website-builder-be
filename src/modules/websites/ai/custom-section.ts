import { AppError } from "../../../common/errors/AppError.js";
import {
  CUSTOM_ALIGNS,
  CUSTOM_CARD_TONES,
  CUSTOM_GAPS,
  CUSTOM_IMAGE_ASPECTS,
  CUSTOM_LIMITS,
  ICON_NAMES,
  type CustomBlock,
  type SectionDataMap,
} from "../types/site-content.types.js";
import { SAFE_HREF, SAFE_IMAGE_URL, customDataSchema } from "../validators/site-content.validator.js";

type CustomData = SectionDataMap["custom"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/**
 * Coerces AI output into a layout that passes `customDataSchema`: unknown blocks, unsafe
 * links/images and anything beyond the depth/size limits are dropped rather than rejected.
 */
export function sanitizeCustomData(raw: Record<string, unknown>): CustomData {
  let budget: number = CUSTOM_LIMITS.maxBlocks;

  const blockList = (value: unknown, level: number): CustomBlock[] =>
    (Array.isArray(value) ? value.slice(0, CUSTOM_LIMITS.maxChildren) : []).flatMap((item) => {
      const block = toBlock(asRecord(item), level);
      return block ? [block] : [];
    });

  const toBlock = (b: Record<string, unknown>, level: number): CustomBlock | null => {
    if (budget <= 0) return null;

    switch (b.type) {
      case "stack":
      case "grid":
      case "card": {
        if (level >= CUSTOM_LIMITS.maxDepth) return null;
        budget -= 1;
        const children = blockList(b.children, level + 1);
        if (children.length === 0) return null;
        if (b.type === "stack") {
          return {
            type: "stack",
            direction: pick(b.direction, ["column", "row"] as const),
            gap: pick(b.gap, CUSTOM_GAPS),
            align: pick(b.align, CUSTOM_ALIGNS),
            children,
          };
        }
        if (b.type === "grid") {
          return {
            type: "grid",
            columns: pick(b.columns, [1, 2, 3, 4] as const) ?? 2,
            gap: pick(b.gap, CUSTOM_GAPS),
            align: pick(b.align, ["start", "center"] as const),
            children,
          };
        }
        return { type: "card", tone: pick(b.tone, CUSTOM_CARD_TONES), children };
      }
      case "heading": {
        const text = str(b.text, 200);
        if (!text) return null;
        budget -= 1;
        return { type: "heading", text, level: pick(b.level, [1, 2, 3] as const) };
      }
      case "text": {
        const text = str(b.text, 1200);
        if (!text) return null;
        budget -= 1;
        return {
          type: "text",
          text,
          size: pick(b.size, ["sm", "md", "lg"] as const),
          muted: typeof b.muted === "boolean" ? b.muted : undefined,
        };
      }
      case "badge": {
        const text = str(b.text, 60);
        if (!text) return null;
        budget -= 1;
        return { type: "badge", text };
      }
      case "button": {
        const label = str(b.label, 80);
        if (!label) return null;
        const href = str(b.href, 2048);
        budget -= 1;
        return {
          type: "button",
          label,
          href: SAFE_HREF.test(href) ? href : "#",
          tone: pick(b.tone, ["primary", "secondary"] as const),
        };
      }
      case "image": {
        const url = str(b.url, 2048);
        if (!SAFE_IMAGE_URL.test(url)) return null;
        budget -= 1;
        return { type: "image", url, alt: str(b.alt, 300), aspect: pick(b.aspect, CUSTOM_IMAGE_ASPECTS) };
      }
      case "icon": {
        const name = pick(b.name, ICON_NAMES);
        if (!name) return null;
        budget -= 1;
        return { type: "icon", name };
      }
      case "list": {
        const items = (Array.isArray(b.items) ? b.items : [])
          .map((item) => str(item, 200))
          .filter(Boolean)
          .slice(0, CUSTOM_LIMITS.maxListItems);
        if (items.length === 0) return null;
        budget -= 1;
        return { type: "list", items };
      }
      default:
        return null;
    }
  };

  const data: CustomData = {
    width: pick(raw.width, ["contained", "wide"] as const),
    align: pick(raw.align, ["start", "center"] as const),
    blocks: blockList(raw.blocks, 1),
  };

  if (data.blocks.length === 0 || customDataSchema.validate(data).error) {
    throw new AppError(502, "AI could not build that layout. Please try describing it differently.");
  }
  return data;
}
