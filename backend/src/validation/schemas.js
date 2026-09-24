import { z } from "zod";

const DIFFICULTIES = ["Débutant", "Intermédiaire", "Expert", "Avancé", "Auto"];

const sessionIdSchema = z
  .string()
  .min(1, "sessionId requis.")
  .max(120, "sessionId trop long.")
  .regex(/^[a-zA-Z0-9_-]+$/, "sessionId invalide.");

export const generateQuizSchema = z.object({
  difficulty: z
    .enum(DIFFICULTIES, { errorMap: () => ({ message: "Difficulty invalide." }) })
    .transform((val) => (val === "Avancé" ? "Expert" : val))
    .optional()
    .default("Débutant"),
  topic: z
    .string({ message: "Thème invalide." })
    .min(1, "Thème requis.")
    .max(100, "Thème trop long (100 caractères max).")
    .optional()
    .default("Mélange"),
  count: z
    .number({ message: "count doit être un nombre." })
    .int("count doit être un entier.")
    .min(1, "Le nombre de questions doit être au moins 1.")
    .max(20, "Le nombre de questions ne peut pas dépasser 20.")
    .default(5),
  sessionId: sessionIdSchema.optional().default("anonymous"),
});

export const resultsSchema = z.object({
  sessionId: sessionIdSchema,
  results: z
    .array(
      z.object({
        questionId: z.union([z.number().int().positive(), z.string().max(80)]).optional(),
        isCorrect: z.boolean("isCorrect doit être un booléen."),
        category: z.string().max(80).optional().default("Mélange"),
      })
    )
    .max(100, "Trop de résultats (100 max).")
    .min(1, "Au moins un résultat requis."),
});

export const chatSchema = z.object({
  question: z
    .string({ message: "Une question valide est requise." })
    .min(1, "Une question valide est requise.")
    .max(5000, "Question trop longue (5000 caractères max)."),
  sessionId: sessionIdSchema.optional().default("anonymous"),
  conversationId: sessionIdSchema.optional(),
  clientId: sessionIdSchema.optional(),
});

export const sessionIdParamsSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  clientId: sessionIdSchema.optional(),
  conversationId: sessionIdSchema.optional(),
});

export const feedbackSchema = z.object({
  question: z
    .string({ message: "Le champ 'question' est requis." })
    .min(1, "La question ne peut pas être vide.")
    .max(5000, "Question trop longue."),
  answer: z
    .string({ message: "Le champ 'answer' est requis." })
    .min(1, "La réponse ne peut pas être vide.")
    .max(10000, "Réponse trop longue."),
  rating: z.enum(['good', 'bad'], {
    errorMap: () => ({ message: "Le champ 'rating' doit être 'good' ou 'bad'." }),
  }),
  feedbackReason: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
  sources: z.array(z.any()).optional().default([]),
  conversationId: sessionIdSchema.optional(),
  clientId: sessionIdSchema.optional(),
});

