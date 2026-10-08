import { Router } from "express";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { websiteController } from "./controllers/website.controller.js";
import { templateKeyParamsSchema } from "./validators/website.validator.js";

/** Unauthenticated: the public template gallery previews platform templates. */
const publicTemplatesRouter = Router();

publicTemplatesRouter.use(rateLimit({ name: "public-templates", max: 120, windowSeconds: 60 }));

publicTemplatesRouter.get("/", websiteController.listPlatformTemplates);
publicTemplatesRouter.get(
  "/:key/preview",
  validate(templateKeyParamsSchema, "params"),
  websiteController.getTemplatePreview,
);

export default publicTemplatesRouter;
