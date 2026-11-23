import { z } from 'zod'

export const userManagementActionSchema = z
  .object({
    confirmationName: z.string().trim().min(1, 'Confirma el nombre completo.'),
    password: z.string().min(1, 'Ingresa tu contraseña.').max(72),
    reason: z
      .string()
      .trim()
      .min(5, 'Describe el motivo con al menos 5 caracteres.')
      .max(1000),
    permanent: z.boolean(),
    endsAt: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.permanent) {
      const endDate = new Date(values.endsAt)
      if (!values.endsAt || !Number.isFinite(endDate.getTime())) {
        context.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'Selecciona la fecha de finalización.',
        })
      } else if (endDate.getTime() <= Date.now()) {
        context.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'La fecha debe ser futura.',
        })
      }
    }
  })

export type UserManagementActionValues = z.infer<
  typeof userManagementActionSchema
>
