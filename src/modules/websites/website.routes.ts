import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { websiteController } from "./controllers/website.controller.js";
import {
  createWebsiteSchema,
  generateAiSuggestionSchema,
  listTemplatesQuerySchema,
  listWebsitesQuerySchema,
  pageContentParamsSchema,
  publishSchema,
  saveDraftSchema,
  savePageContentSchema,
  savedSectionParamsSchema,
  saveSectionSchema,
  saveTemplateSchema,
  templateIdParamsSchema,
  updateTemplateSchema,
  updateWebsiteSchema,
  websiteIdParamsSchema,
} from "./validators/website.validator.js";

/** Shared by Super Admin and clients; the service limits clients to their own websites and templates. */
const websitesRouter = Router();
const byId = validate(websiteIdParamsSchema, "params");
const byTemplateId = validate(templateIdParamsSchema, "params");

websitesRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));

websitesRouter.get("/templates", validate(listTemplatesQuerySchema, "query"), websiteController.listTemplates);
websitesRouter.patch("/templates/:templateId", byTemplateId, validate(updateTemplateSchema), websiteController.updateTemplate);
websitesRouter.delete("/templates/:templateId", byTemplateId, websiteController.deleteTemplate);
websitesRouter.get("/themes", websiteController.listThemes);
websitesRouter.get("/", validate(listWebsitesQuerySchema, "query"), websiteController.list);
websitesRouter.post(
  "/",
  rateLimit({ name: "website-create", max: 30, windowSeconds: 60 * 60 }),
  validate(createWebsiteSchema),
  websiteController.create,
);
websitesRouter.get("/:id", byId, websiteController.get);
websitesRouter.patch("/:id", byId, validate(updateWebsiteSchema), websiteController.update);
websitesRouter.delete("/:id", byId, websiteController.delete);
websitesRouter.put("/:id/draft", byId, validate(saveDraftSchema), websiteController.saveDraft);
websitesRouter.put(
  "/:id/pages/:pageId/content",
  validate(pageContentParamsSchema, "params"),
  rateLimit({ name: "page-autosave", max: 240, windowSeconds: 60 }),
  validate(savePageContentSchema),
  websiteController.savePageContent,
);
websitesRouter.post(
  "/:id/publish",
  byId,
  rateLimit({ name: "website-publish", max: 30, windowSeconds: 60 * 60 }),
  validate(publishSchema),
  websiteController.publish,
);
websitesRouter.get("/:id/versions", byId, websiteController.listVersions);
websitesRouter.post(
  "/:id/templates",
  byId,
  rateLimit({ name: "template-save", max: 30, windowSeconds: 60 * 60 }),
  validate(saveTemplateSchema),
  websiteController.saveAsTemplate,
);
websitesRouter.get("/:id/saved-sections", byId, websiteController.listSavedSections);
websitesRouter.post(
  "/:id/saved-sections",
  byId,
  validate(saveSectionSchema),
  websiteController.saveSection,
);
websitesRouter.delete(
  "/:id/saved-sections/:savedSectionId",
  validate(savedSectionParamsSchema, "params"),
  websiteController.deleteSavedSection,
);
websitesRouter.post(
  "/:id/ai/generate",
  byId,
  rateLimit({ name: "website-ai-generate", max: 60, windowSeconds: 60 }),
  validate(generateAiSuggestionSchema),
  websiteController.generateAiSuggestion,
);

export default websitesRouter;
