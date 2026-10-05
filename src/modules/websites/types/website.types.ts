import type { BuilderType, PageType, WebsiteStatus } from "../../../common/constants/website.js";
import type { FooterData, HeaderData, Section, ThemeSettings } from "./site-content.types.js";

export type WebsiteSummary = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  builderType: BuilderType;
  status: WebsiteStatus;
  subdomain: string;
  pageCount: number;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteInfo = {
  businessName: string | null;
  websiteType: string | null;
  industry: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
};

export type PageView = {
  id: string;
  name: string;
  slug: string;
  pageType: PageType;
  visible: boolean;
  showInNav: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: Section[];
};

export type WebsiteDraft = {
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageView[];
  /** Send back as `expectedDraftUpdatedAt` when saving, to detect concurrent edits. */
  draftUpdatedAt: string;
};

export type WebsiteDetail = WebsiteSummary & { info: WebsiteInfo; draft: WebsiteDraft };

export type WebsiteListQuery = {
  search?: string;
  clientId?: string;
  status?: WebsiteStatus;
  builderType?: BuilderType;
  page: number;
  pageSize: number;
};

export type WebsiteListResult = {
  items: WebsiteSummary[];
  total: number;
  page: number;
  pageSize: number;
};

type WebsiteInfoInput = {
  [K in keyof WebsiteInfo]?: string | null;
};

export type CreateWebsiteInput = WebsiteInfoInput & {
  /** Required for Super Admin; ignored for clients (their own workspace is used). */
  clientId?: string;
  name: string;
  /** Omitted = start blank (one empty home page). */
  templateKey?: string;
  /** Overrides the template's theme. */
  themeId?: string;
  subdomain?: string;
};

export type UpdateWebsiteInput = WebsiteInfoInput & { name?: string };

export type PageInput = {
  /** Existing page id to keep; unknown ids are treated as new pages. */
  id?: string;
  name: string;
  slug: string;
  pageType: PageType;
  visible: boolean;
  showInNav: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sections: Section[];
};

export type SaveDraftInput = {
  expectedDraftUpdatedAt: string;
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageInput[];
};

export type TemplateListQuery = {
  /** Super Admin only: include this client's own templates. */
  clientId?: string;
};

export type SaveTemplateInput = { name: string; description?: string | null };

export type UpdateTemplateInput = { name?: string; description?: string | null };

export type SavedSectionView = {
  id: string;
  name: string;
  sectionType: Section["type"];
  section: Section;
  /** Shared by the platform (read-only for clients). */
  isPlatform: boolean;
  createdAt: string;
};

export type SaveSectionInput = { name: string; section: Section };

export type ThemeSummary = { id: string; name: string; settings: ThemeSettings };

export type WebsiteTemplateSummary = {
  id: string;
  key: string;
  /** True for a client's own saved template; false for platform templates. */
  isCustom: boolean;
  name: string;
  category: string;
  description: string | null;
  thumbnailUrl: string | null;
  themeId: string | null;
  pages: { name: string; slug: string }[];
};
