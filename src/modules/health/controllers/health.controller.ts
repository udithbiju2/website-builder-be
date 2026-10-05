import type { Request, Response } from "express";
import { healthService } from "../services/health.service.js";

export class HealthController {
  check = async (_req: Request, res: Response) => {
    const report = await healthService.check();
    res.status(report.status === "ok" ? 200 : 503).json(report);
  };
}

export const healthController = new HealthController();
