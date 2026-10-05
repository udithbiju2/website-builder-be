import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { emailController } from "./controllers/email.controller.js";
import { sendTestEmailSchema, updateEmailConfigSchema } from "./validators/email.validator.js";

const emailSettingsRouter = Router();

emailSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

emailSettingsRouter.get("/", emailController.getConfig);
emailSettingsRouter.put("/", validate(updateEmailConfigSchema), emailController.updateConfig);
emailSettingsRouter.post(
  "/test",
  rateLimit({ name: "email-test", max: 10, windowSeconds: 60 * 60 }),
  validate(sendTestEmailSchema),
  emailController.sendTest,
);

export default emailSettingsRouter;
