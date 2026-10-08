import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError.js";
import { aiSettingsService } from "../services/ai-settings.service.js";

function requireClientId(req: Request): string {
  const clientId = req.user?.clientId;
  if (!clientId) throw new AppError(403, "This account is not linked to a client workspace.", "FORBIDDEN");
  return clientId;
}

export class ClientAiSettingsController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ settings: await aiSettingsService.getClientSettings(requireClientId(req)) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { model } = req.body as { model: string | null };
      res.json({ settings: await aiSettingsService.updateClientSettings(requireClientId(req), model) });
    } catch (error) {
      next(error);
    }
  };
}

export const clientAiSettingsController = new ClientAiSettingsController();
