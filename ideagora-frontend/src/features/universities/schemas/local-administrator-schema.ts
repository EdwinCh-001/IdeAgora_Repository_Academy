import { z } from 'zod'

export const localAdministratorSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresa los nombres.').max(100),
  lastName: z.string().trim().min(1, 'Ingresa los apellidos.').max(100),
  email: z.string().trim().email('Ingresa un correo válido.').max(254),
  emailDomain: z
    .string()
    .trim()
    .regex(
      /^@?(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i,
      'Ingresa un dominio válido.',
    ),
  phone: z.string().trim().min(1, 'Ingresa un teléfono.').max(20),
  jobTitle: z.string().trim().min(1, 'Ingresa el cargo.').max(120),
  campusId: z.string(),
}).superRefine((values, context) => {
  const emailDomain = values.email.split('@').at(-1)?.toLowerCase()
  const enteredDomain = values.emailDomain.trim().replace(/^@/, '').toLowerCase()
  if (emailDomain && enteredDomain !== emailDomain) {
    context.addIssue({
      code: 'custom',
      message: 'El dominio debe coincidir con el correo.',
      path: ['emailDomain'],
    })
  }
})

export type LocalAdministratorFormValues = z.infer<
  typeof localAdministratorSchema
>
