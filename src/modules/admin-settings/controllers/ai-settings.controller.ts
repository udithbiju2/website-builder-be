import type { NextFunction, Request, Response } from "express";
import { aiSettingsService } from "../services/ai-settings.service.js";

export class AiSettingsController {
  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await aiSettingsService.getConfigView();
      res.json({ config });
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await aiSettingsService.updateConfig(req.body);
      res.json({ config });
    } catch (error) {
      next(error);
    }
  };
}

export const aiSettingsController = new AiSettingsController();
