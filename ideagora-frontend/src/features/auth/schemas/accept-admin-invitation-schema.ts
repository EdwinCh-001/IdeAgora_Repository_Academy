import { z } from 'zod'

export const acceptAdminInvitationSchema = z
  .object({
    password: z
      .string()
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{10,72}$/,
        'Usa al menos 10 caracteres, mayúscula, minúscula y número.',
      ),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

export type AcceptAdminInvitationFormValues = z.infer<
  typeof acceptAdminInvitationSchema
>
