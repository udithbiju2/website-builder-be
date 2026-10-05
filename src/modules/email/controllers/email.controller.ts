import type { NextFunction, Request, Response } from "express";
import { logger } from "../../../config/logger.js";
import { emailService } from "../services/email.service.js";

export class EmailController {
  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await emailService.getConfigView() });
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await emailService.updateConfig(req.body);
      logger.info({ userId: req.user?.id }, "Email configuration updated by Super Admin");
      res.json({ config });
    } catch (error) {
      next(error);
    }
  };

  sendTest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await emailService.sendTest(req.body.to);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const emailController = new EmailController();
