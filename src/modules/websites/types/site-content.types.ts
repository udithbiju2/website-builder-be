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
export const HEADER_DESIGNS = [
  "logo-left",
  "centered",
  "classical",
  "minimalist",
  "comprehensive",
  "ecommerce",
  "floating",
  "transparent",
] as const;
export const FOOTER_DESIGNS = [
  "columns",
  "simple",
  "mega",
  "newsletter",
  "split",
  "inline",
  "centered",
  "cta-banner",
] as const;
export const SECTION_BACKGROUNDS = ["default", "surface", "primary", "dark"] as const;
export const SECTION_SPACINGS = ["none", "compact", "default", "relaxed"] as const;
export const SECTION_ALIGNMENTS = ["center", "left"] as const;
export const ICON_NAMES = ["check", "star", "bolt", "shield", "heart", "chat"] as const;
export const SECTION_TYPES = [
  "header",
  "footer",
  "hero",
  "features",
  "services",
  "testimonials",
  "faq",
  "cta",
  "contact",
  "text",
  "gallery",
  "logos",
  "split",
  "stats",
  "pricing",
  "media",
  "team",
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

export type HeaderSubMenuItem = {
  label: string;
  href: string;
  description?: string;
  badge?: string;
  icon?: string;
};

export type HeaderMenuItem = {
  label: string;
  href: string;
  badge?: string;
  icon?: string;
  children?: HeaderSubMenuItem[];
};

export type HeaderData = {
  design: (typeof HEADER_DESIGNS)[number];
  siteName: string;
  logo?: ImageRef;
  menu: HeaderMenuItem[];
  cta?: LinkRef;
  secondaryCta?: LinkRef;
  announcement?: string;
  announcementLink?: LinkRef;
  position?: "static" | "sticky" | "fixed" | "floating";
  sticky: boolean;
  overlay?: boolean;
  showSearch?: boolean;
  showAccount?: boolean;
  showCart?: boolean;
  cartCount?: number;
  currency?: string;
  mobileMenuType?: "drawer" | "fullscreen" | "dropdown";
  hidden?: boolean;
};

export type FooterNewsletter = {
  enabled?: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
};

export type FooterCtaBanner = {
  enabled?: boolean;
  heading?: string;
  subheading?: string;
  primaryCta?: LinkRef;
  secondaryCta?: LinkRef;
};

export type FooterPaymentMethods = {
  enabled?: boolean;
  methods?: string[];
};

export type FooterContact = {
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
};

export type FooterData = {
  design: (typeof FOOTER_DESIGNS)[number];
  siteName: string;
  logo?: ImageRef;
  tagline?: string;
  description?: string;
  columns: { title: string; links: LinkRef[] }[];
  menu?: LinkRef[];
  contact?: FooterContact;
  social: LinkRef[];
  newsletter?: FooterNewsletter;
  ctaBanner?: FooterCtaBanner;
  paymentMethods?: FooterPaymentMethods;
  legalLinks?: LinkRef[];
  copyright: string;
  themeMode?: "dark" | "light" | "auto";
  hidden?: boolean;
};

export type SectionSettings = {
  background: (typeof SECTION_BACKGROUNDS)[number];
  hideOnMobile: boolean;
  hideOnDesktop?: boolean;
  spacing?: (typeof SECTION_SPACINGS)[number];
  align?: (typeof SECTION_ALIGNMENTS)[number];
  /** In-page anchor (`#pricing`); lowercase words and hyphens only. */
  anchor?: string;
};

export type SectionDataMap = {
  header: HeaderData;
  footer: FooterData;
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
  logos: { heading?: string; grayscale: boolean; logos: ImageRef[] };
  split: {
    eyebrow?: string;
    heading: string;
    body: string;
    bullets: string[];
    image?: ImageRef;
    imagePosition: "left" | "right";
    cta?: LinkRef;
  };
  stats: { heading?: string; intro?: string; items: { value: string; label: string }[] };
  pricing: {
    heading: string;
    intro?: string;
    plans: {
      name: string;
      price: string;
      period?: string;
      description?: string;
      features: string[];
      cta?: LinkRef;
      featured: boolean;
    }[];
  };
  media: {
    heading?: string;
    caption?: string;
    kind: "image" | "video";
    image?: ImageRef;
    /** YouTube or Vimeo page URL; rendered only as a privacy-enhanced embed. */
    videoUrl?: string;
    aspect: "16:9" | "4:3" | "1:1";
    width: "contained" | "wide";
  };
  team: {
    heading: string;
    intro?: string;
    columns: GridColumns;
    mobileColumns: GridColumns;
    members: { name: string; role?: string; bio?: string; photo?: ImageRef; link?: LinkRef }[];
  };
};

export type SectionOf<T extends SectionType> = T extends SectionType
  ? { id: string; type: T; hidden: boolean; settings: SectionSettings; data: SectionDataMap[T] }
  : never;

export type Section = SectionOf<SectionType>;
