/**
 * Website content stored in JSON columns. Mirrors frontend/src/site-kit/types.ts;
 * keep the two in sync until the kit moves into a shared package.
 */

export type ImageRef = { url: string; alt: string };
export type LinkRef = { label: string; href: string };

export const FONT_KEYS = ["plex-sans", "system", "serif", "mono"] as const;
export const BUTTON_STYLES = ["filled", "outline"] as const;
export const CARD_STYLES = ["border", "shadow", "flat"] as const;
export const RADIUS_SIZES = ["none", "sm", "md", "lg"] as const;
export const SPACING_SIZES = ["compact", "normal", "relaxed"] as const;
export const HEADER_DESIGNS = ["logo-left", "centered"] as const;
export const FOOTER_DESIGNS = ["columns", "simple"] as const;
export const SECTION_BACKGROUNDS = ["default", "surface", "primary"] as const;
export const ICON_NAMES = ["check", "star", "bolt", "shield", "heart", "chat"] as const;
export const SECTION_TYPES = [
  "hero",
  "features",
  "services",
  "testimonials",
  "faq",
  "cta",
  "contact",
  "text",
  "gallery",
] as const;

export type FontKey = (typeof FONT_KEYS)[number];
export type IconName = (typeof ICON_NAMES)[number];
export type SectionType = (typeof SECTION_TYPES)[number];
export type GridColumns = 1 | 2 | 3 | 4;

export type ThemeSettings = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  fonts: { heading: FontKey; body: FontKey };
  buttonStyle: (typeof BUTTON_STYLES)[number];
  cardStyle: (typeof CARD_STYLES)[number];
  radius: (typeof RADIUS_SIZES)[number];
  containerWidth: number;
  sectionSpacing: (typeof SPACING_SIZES)[number];
};

export type HeaderData = {
  design: (typeof HEADER_DESIGNS)[number];
  siteName: string;
  logo?: ImageRef;
  menu: LinkRef[];
  cta?: LinkRef;
  announcement?: string;
  sticky: boolean;
};

export type FooterData = {
  design: (typeof FOOTER_DESIGNS)[number];
  siteName: string;
  logo?: ImageRef;
  description?: string;
  columns: { title: string; links: LinkRef[] }[];
  contact?: { email?: string; phone?: string; address?: string };
  social: LinkRef[];
  copyright: string;
};

export type SectionSettings = {
  background: (typeof SECTION_BACKGROUNDS)[number];
  hideOnMobile: boolean;
};

export type SectionDataMap = {
  hero: {
    variant: "centered" | "split";
    eyebrow?: string;
    heading: string;
    subheading?: string;
    primaryCta?: LinkRef;
    secondaryCta?: LinkRef;
    image?: ImageRef;
  };
  features: {
    heading: string;
    intro?: string;
    columns: GridColumns;
    mobileColumns: GridColumns;
    items: { icon?: IconName; title: string; description: string }[];
  };
  services: {
    heading: string;
    intro?: string;
    columns: GridColumns;
    mobileColumns: GridColumns;
    items: { title: string; description: string; image?: ImageRef; link?: LinkRef }[];
  };
  testimonials: {
    heading: string;
    items: { quote: string; name: string; role?: string }[];
  };
  faq: {
    heading: string;
    intro?: string;
    items: { question: string; answer: string }[];
  };
  cta: { heading: string; text?: string; button: LinkRef };
  contact: {
    heading: string;
    text?: string;
    email?: string;
    phone?: string;
    address?: string;
    showForm: boolean;
    submitLabel: string;
  };
  text: { heading?: string; body: string };
  gallery: {
    heading?: string;
    columns: GridColumns;
    mobileColumns: GridColumns;
    images: ImageRef[];
  };
};

export type SectionOf<T extends SectionType> = T extends SectionType
  ? { id: string; type: T; hidden: boolean; settings: SectionSettings; data: SectionDataMap[T] }
  : never;

export type Section = SectionOf<SectionType>;
