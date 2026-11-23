import { z } from 'zod'

const registerPayloadSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresa tus nombres.').max(100),
  lastName: z.string().trim().min(1, 'Ingresa tus apellidos.').max(100),
  email: z
    .string()
    .trim()
    .email('Ingresa un correo válido.')
    .max(254, 'El correo es demasiado largo.'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{10,72}$/,
      'Usa al menos 10 caracteres, una mayúscula, una minúscula y un número.',
    ),
  facultyId: z.string().min(1, 'Selecciona una facultad.'),
  careerId: z.string().min(1, 'Selecciona una carrera.'),
  interestIds: z.array(z.string()).max(20),
})

const registerInputSchema = registerPayloadSchema.extend({
  confirmPassword: z.string(),
})

export const registerSchema = registerInputSchema
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: 'custom',
        message: 'Las contraseñas no coinciden.',
        path: ['confirmPassword'],
      })
    }
  })
  .transform((values) => registerPayloadSchema.parse(values))

export type RegisterFormInput = z.input<typeof registerSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
