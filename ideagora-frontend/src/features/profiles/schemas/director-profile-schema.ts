import { z } from 'zod'

export const directorProfileSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(10, 'Escribe al menos 10 caracteres.')
      .max(3000, 'El resumen no puede superar 3000 caracteres.'),
    specializationsText: z.string(),
    academicDegreesText: z.string(),
    workExperienceText: z.string(),
    externalLinksText: z.string(),
  })
  .superRefine(({ externalLinksText }, context) => {
    const links = externalLinksText
      .split(/\r?\n/)
      .map((link) => link.trim())
      .filter(Boolean)

    links.forEach((link, index) => {
      try {
        const url = new URL(link)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('Unsupported protocol')
        }
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['externalLinksText'],
          message: `El enlace de la línea ${index + 1} no es una URL HTTP o HTTPS válida.`,
        })
      }
    })
  })

export type DirectorProfileFormValues = z.infer<typeof directorProfileSchema>

export const directorProfileReviewSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().trim(),
  })
  .superRefine(({ decision, reason }, context) => {
    if (decision === 'REJECTED' && reason.length < 5) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Describe el motivo del rechazo con al menos 5 caracteres.',
      })
    }
    if (reason.length > 500) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'El motivo no puede superar 500 caracteres.',
      })
    }
  })

export type DirectorProfileReviewFormValues = z.infer<
  typeof directorProfileReviewSchema
>
