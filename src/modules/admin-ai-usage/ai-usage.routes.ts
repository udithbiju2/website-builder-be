import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { aiUsageController } from "./controllers/ai-usage.controller.js";
import { listAiUsageQuerySchema } from "./validators/ai-usage.validator.js";

const aiUsageRouter = Router();

aiUsageRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

aiUsageRouter.get("/", validate(listAiUsageQuerySchema, "query"), aiUsageController.list);

export default aiUsageRouter;
