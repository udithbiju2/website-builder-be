import type { NextFunction, Request, Response } from "express";
import { BuilderType } from "../../../common/constants/website.js";
import { aiGeneratorService, type GenerateAiOptions } from "../services/ai-generator.service.js";
import { aiSiteCopilotService } from "../services/ai-site-copilot.service.js";
import { isGeneratedSectionType } from "../services/site-generator.js";
import { websiteGenerationService } from "../services/website-generation.service.js";
import { websiteService } from "../services/website.service.js";
import type { TemplateListQuery, WebsiteListQuery } from "../types/website.types.js";

type IdParams = { id: string };
type TemplateParams = { templateId: string };
type SavedSectionParams = { id: string; savedSectionId: string };
type PageParams = { id: string; pageId: string };

export class WebsiteController {
  listTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ templates: await websiteService.listTemplates(req.query as TemplateListQuery, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  saveAsTemplate = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ template: await websiteService.saveAsTemplate(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await websiteService.updateTemplate(req.params.templateId, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      await websiteService.deleteTemplate(req.params.templateId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  listSavedSections = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ sections: await websiteService.listSavedSections(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  saveSection = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ section: await websiteService.saveSection(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  deleteSavedSection = async (req: Request<SavedSectionParams>, res: Response, next: NextFunction) => {
    try {
      await websiteService.deleteSavedSection(req.params.id, req.params.savedSectionId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  listThemes = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ themes: await websiteService.listThemes() });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await websiteService.list(req.query as unknown as WebsiteListQuery, req.user!));
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.get(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ website: await websiteService.create(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  createWithAi = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ website: await websiteGenerationService.createWithAi(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  generationStatus = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ generation: await websiteGenerationService.status(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  retryGeneration = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ generation: await websiteGenerationService.retry(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  dismissGeneration = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await websiteGenerationService.dismiss(req.params.id, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.update(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await websiteService.delete(req.params.id, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  saveDraft = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.saveDraft(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  savePageContent = async (req: Request<PageParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await websiteService.savePageContent(req.params.id, req.params.pageId, req.body, req.user!));
    } catch (error) {
      next(error);
    }
  };

  publish = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.publish(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  listVersions = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ versions: await websiteService.listVersions(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  generateAiSuggestion = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      // Ensure user has access to this website
      const website = await websiteService.get(req.params.id, req.user!);
      const body = req.body as GenerateAiOptions;
      const selectedType = body.scope === "section" ? body.currentSection?.type : undefined;
      if (website.builderType === BuilderType.AI && (selectedType === undefined || isGeneratedSectionType(selectedType))) {
        const suggestion = await aiSiteCopilotService.generate({ ...body, website, userId: req.user?.id ?? null });
        res.json({ suggestion });
        return;
      }
      const suggestion = await aiGeneratorService.generate({
        ...req.body,
        clientId: website.clientId,
        websiteId: website.id,
        userId: req.user?.id,
      });
      res.json({ suggestion });
    } catch (error) {
      next(error);
    }
  };
}

export const websiteController = new WebsiteController();
