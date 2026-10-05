import Joi from "joi";

export const updateEmailConfigSchema = Joi.object({
  resendApiKey: Joi.string().trim().max(255).allow("").optional(),
  fromEmail: Joi.string().trim().email().max(255).required(),
  fromName: Joi.string().trim().min(1).max(255).required(),
  enabled: Joi.boolean().required(),
});

export const sendTestEmailSchema = Joi.object({
  to: Joi.string().trim().email().max(255).required(),
});
