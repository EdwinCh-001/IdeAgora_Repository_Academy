import { z } from 'zod'

const campusSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Ingresa el nombre de la sede.').max(200),
  legalName: z.string().trim().max(200),
  province: z.string().trim().min(1, 'Ingresa la provincia.').max(100),
  city: z.string().trim().min(1, 'Ingresa la ciudad.').max(100),
  reference: z.string().trim().max(255),
})

export const universitySchema = z.object({
  accreditationCode: z
    .string()
    .trim()
    .min(1, 'Ingresa el código de acreditación o RUC.')
    .max(100),
  name: z.string().trim().min(1, 'Ingresa el nombre oficial.').max(200),
  acronym: z.string().trim().max(20),
  province: z.string().trim().min(1, 'Ingresa la provincia.').max(100),
  city: z.string().trim().min(1, 'Ingresa la ciudad.').max(100),
  website: z.union([z.literal(''), z.string().url('Ingresa un sitio web válido.')]),
  campuses: z.array(campusSchema).max(50),
  domains: z
    .array(
      z.object({
        domain: z
          .string()
          .trim()
          .min(1, 'Ingresa un dominio.')
          .max(255)
          .regex(
            /^@?(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i,
            'Ingresa un dominio válido.',
          ),
        campusIndex: z.string(),
      }),
    )
    .min(1, 'Agrega al menos un dominio institucional.'),
})

export type UniversityFormValues = z.infer<typeof universitySchema>
