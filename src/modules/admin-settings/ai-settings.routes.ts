import { Router } from "express";
import Joi from "joi";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { aiSettingsController } from "./controllers/ai-settings.controller.js";

const updateAiConfigSchema = Joi.object({
  openaiApiKey: Joi.string().trim().allow("").optional(),
  model: Joi.string().trim().max(100).required(),
});

const aiSettingsRouter = Router();

aiSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

aiSettingsRouter.get("/", aiSettingsController.getConfig);
aiSettingsRouter.put("/", validate(updateAiConfigSchema), aiSettingsController.updateConfig);

export default aiSettingsRouter;
