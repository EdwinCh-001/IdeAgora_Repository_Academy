import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormRegisterReturn,
} from 'react-hook-form'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { universitiesApi } from '../api/universities-api'
import {
  localAdministratorSchema,
  type LocalAdministratorFormValues,
} from '../schemas/local-administrator-schema'
import {
  universitySchema,
  type UniversityFormValues,
} from '../schemas/university-schema'
import type {
  UniversityPayload,
  UniversityRecord,
} from '../types/university-types'
import { AdminWorkspace } from '../../../shared/ui/admin-workspace'
import { NotificationModal } from '../../../shared/ui/notification-modal'

const emptyUniversity: UniversityFormValues = {
  accreditationCode: '',
  name: '',
  acronym: '',
  province: '',
  city: '',
  website: '',
  campuses: [],
  domains: [{ domain: '', campusIndex: '' }],
}

interface UniversityAdminPageProps {
  onLogout: () => Promise<void>
  onManageUsers: () => void
}

export function UniversityAdminPage({
  onLogout,
  onManageUsers,
}: UniversityAdminPageProps) {
  const [universities, setUniversities] = useState<UniversityRecord[]>([])
  const [selected, setSelected] = useState<UniversityRecord | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const universityForm = useForm<UniversityFormValues>({
    resolver: zodResolver(universitySchema),
    defaultValues: emptyUniversity,
    mode: 'onTouched',
  })
  const campusFields = useFieldArray({
    control: universityForm.control,
    name: 'campuses',
  })
  const domainFields = useFieldArray({
    control: universityForm.control,
    name: 'domains',
  })
  const watchedCampuses = useWatch({
    control: universityForm.control,
    name: 'campuses',
  })
  const administratorForm = useForm<LocalAdministratorFormValues>({
    resolver: zodResolver(localAdministratorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      emailDomain: '',
      phone: '',
      jobTitle: '',
      campusId: '',
    },
    mode: 'onTouched',
  })

  const loadUniversities = useCallback(async () => {
    try {
      const results = await universitiesApi.list()
      setUniversities(results)
      setSelected((current) =>
        current ? results.find(({ id }) => id === current.id) ?? null : null,
      )
      return results
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudieron cargar las universidades.'),
      )
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void universitiesApi
      .list()
      .then((results) => {
        if (active) setUniversities(results)
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            getApiErrorMessage(
              error,
              'No se pudieron cargar las universidades.',
            ),
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const beginEdit = (university: UniversityRecord) => {
    setSelected(university)
    setErrorMessage('')
    setSuccessMessage('')
    const activeCampuses = university.campuses.filter(
      (campus) => campus.status === 'ACTIVE',
    )
    const activeCampusIds = new Set(activeCampuses.map(({ id }) => id))
    universityForm.reset({
      accreditationCode: university.accreditationCode,
      name: university.name,
      acronym: university.acronym ?? '',
      province: university.province,
      city: university.city,
      website: university.website ?? '',
      campuses: activeCampuses.map((campus) => ({
        id: campus.id,
        name: campus.name,
        legalName: campus.legalName ?? '',
        province: campus.province,
        city: campus.city,
        reference: campus.reference ?? '',
      })),
      domains: university.domains
        .filter(
          (domain) =>
          domain.campusId === null || activeCampusIds.has(domain.campusId),
        )
        .map((domain) => ({
        domain: domain.domain,
        campusIndex: campusIndexFor(activeCampuses, domain.campusId),
      })),
    })
  }

  const startNew = () => {
    setSelected(null)
    setErrorMessage('')
    setSuccessMessage('')
    universityForm.reset(emptyUniversity)
  }

  const removeCampus = (index: number) => {
    const updatedDomains = universityForm
      .getValues('domains')
      .filter((domain) => domain.campusIndex !== String(index))
      .map((domain) => {
        const campusIndex = Number(domain.campusIndex)
        return domain.campusIndex && campusIndex > index
          ? { ...domain, campusIndex: String(campusIndex - 1) }
          : domain
      })
    domainFields.replace(
      updatedDomains.length > 0
        ? updatedDomains
        : [{ domain: '', campusIndex: '' }],
    )
    campusFields.remove(index)
  }

  const saveUniversity = universityForm.handleSubmit(async (values) => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsSaving(true)
    const payload: UniversityPayload = {
      accreditationCode: values.accreditationCode,
      name: values.name,
      acronym: values.acronym || null,
      province: values.province,
      city: values.city,
      website: values.website || null,
      campuses: values.campuses.map((campus) => ({
        ...(campus.id ? { id: campus.id } : {}),
        name: campus.name,
        legalName: campus.legalName || null,
        province: campus.province,
        city: campus.city,
        reference: campus.reference || null,
      })),
      domains: values.domains.map((domain) => ({
        domain: domain.domain,
        ...(domain.campusIndex
          ? { campusIndex: Number(domain.campusIndex) }
          : {}),
      })),
    }

    try {
      const result = selected
        ? await universitiesApi.update(selected.id, payload)
        : await universitiesApi.create(payload)
      const results = await loadUniversities()
      const refreshed = results?.find(({ id }) => id === result.id)
      if (refreshed) beginEdit(refreshed)
      setSuccessMessage(
        selected
          ? 'Universidad actualizada correctamente.'
          : 'Universidad creada en estado pendiente. Asigna un administrador local para activarla.',
      )
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo guardar la universidad.'),
      )
    } finally {
      setIsSaving(false)
    }
  })

  const deactivate = async (university: UniversityRecord) => {
    if (
      !window.confirm(
        `¿Dar de baja a ${university.name}? La universidad conservará sus datos.`,
      )
    ) {
      return
    }
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await universitiesApi.deactivate(university.id)
      await loadUniversities()
      setSuccessMessage('Universidad dada de baja. Sus datos se conservaron.')
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo dar de baja la universidad.'),
      )
    }
  }

  const reactivate = async (university: UniversityRecord) => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsSaving(true)
    try {
      const result = await universitiesApi.reactivate(university.id)
      setUniversities((current) =>
        current.map((item) => (item.id === result.id ? result : item)),
      )
      beginEdit(result)
      setSuccessMessage(
        result.status === 'PENDING'
          ? 'Universidad reactivada como pendiente. Reenvía la invitación al representante para activarla.'
          : 'Universidad reactivada correctamente.',
      )
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo reactivar la universidad.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const inviteAdministrator =
    administratorForm.handleSubmit(async (values) => {
      if (!selected) return
      setErrorMessage('')
      setSuccessMessage('')
      if (!photo) {
        setErrorMessage('La fotografía de perfil es obligatoria.')
        return
      }
      if (photo.size > 5 * 1024 * 1024) {
        setErrorMessage('La fotografía no puede superar 5 MB.')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
        setErrorMessage('La fotografía debe ser JPG, PNG o WebP.')
        return
      }

      setIsSaving(true)
      try {
        const uploaded = await universitiesApi.uploadAdministratorPhoto(photo)
        const result = await universitiesApi.inviteAdministrator(selected.id, {
          ...values,
          campusId: values.campusId || null,
          avatarUrl: uploaded.url,
        })
        administratorForm.reset()
        setPhoto(null)
        await loadUniversities()
        setSuccessMessage(result.message)
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(error, 'No se pudo enviar la invitación.'),
        )
      } finally {
        setIsSaving(false)
      }
    })

  const resendInvitation = async (administrator: UniversityRecord['administrators'][number]) => {
    if (!selected) return
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await universitiesApi.resendInvitation(
        selected.id,
        administrator.id,
      )
      setSuccessMessage(result.message)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo reenviar la invitación.'),
      )
    }
  }

  return (
    <AdminWorkspace
      roleLabel="Administrador global"
      links={[
        { id: 'universities', label: 'Universidades', active: true },
        { id: 'users', label: 'Usuarios', onClick: onManageUsers },
      ]}
    >
    <main className="university-admin">
      <header className="university-admin-header">
        <div>
          <p className="eyebrow">Administración global</p>
          <h1>Universidades</h1>
          <p>Gestiona instituciones, sedes, dominios y representantes.</p>
        </div>
        <nav className="admin-header-actions" aria-label="Navegación">
          <button
            className="button button-quiet"
            type="button"
            onClick={() => void onLogout()}
          >
            Cerrar sesión
          </button>
        </nav>
      </header>

      <NotificationModal
        errorMessage={errorMessage}
        successMessage={successMessage}
        onClose={() => {
          setErrorMessage('')
          setSuccessMessage('')
        }}
      />

      <div className="university-admin-layout">
        <aside className="university-list-card">
          <div className="university-list-heading">
            <h2>Instituciones</h2>
            <button className="button button-primary" type="button" onClick={startNew}>
              Nueva
            </button>
          </div>
          {isLoading ? (
            <p role="status">Cargando universidades…</p>
          ) : universities.length === 0 ? (
            <p className="empty-message">Todavía no hay universidades registradas.</p>
          ) : (
            <ul className="university-list">
              {universities.map((university) => (
                <li key={university.id}>
                  <button
                    className={`university-list-item${selected?.id === university.id ? ' is-selected' : ''}`}
                    type="button"
                    onClick={() => beginEdit(university)}
                  >
                    <span>{university.name}</span>
                    <small>{universityStatus(university.status)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="university-editor">
          <form className="university-panel" onSubmit={saveUniversity} noValidate>
            <div className="university-panel-heading">
              <div>
                <p className="eyebrow">{selected ? 'Editar institución' : 'Nueva institución'}</p>
                <h2>{selected?.name ?? 'Datos de la universidad'}</h2>
              </div>
              {selected && (
                <span
                  className={`status-pill is-${selected.status.toLowerCase()}`}
                >
                  {universityStatus(selected.status)}
                </span>
              )}
            </div>
            <div className="form-grid">
              <Field
                label="Código de acreditación o RUC"
                error={universityForm.formState.errors.accreditationCode?.message}
                registration={universityForm.register('accreditationCode')}
              />
              <Field
                label="Nombre oficial"
                error={universityForm.formState.errors.name?.message}
                registration={universityForm.register('name')}
              />
              <Field
                label="Sigla o acrónimo"
                registration={universityForm.register('acronym')}
              />
              <Field
                label="Sitio web institucional"
                placeholder="https://universidad.edu.ec"
                error={universityForm.formState.errors.website?.message}
                registration={universityForm.register('website')}
              />
              <Field
                label="Provincia"
                error={universityForm.formState.errors.province?.message}
                registration={universityForm.register('province')}
              />
              <Field
                label="Ciudad"
                error={universityForm.formState.errors.city?.message}
                registration={universityForm.register('city')}
              />
            </div>

            <div className="admin-section-heading">
              <div>
                <h3>Sedes oficiales</h3>
                <p>Agrega las sedes disponibles. Este apartado es opcional.</p>
              </div>
              <button
                className="button button-secondary"
                type="button"
                onClick={() =>
                  campusFields.append({
                    name: '',
                    legalName: '',
                    province: universityForm.getValues('province'),
                    city: universityForm.getValues('city'),
                    reference: '',
                  })
                }
              >
                Agregar sede
              </button>
            </div>
            {campusFields.fields.map((campus, index) => (
              <div className="admin-array-row" key={campus.id}>
                <Field
                  label="Nombre de sede"
                  error={universityForm.formState.errors.campuses?.[index]?.name?.message}
                  registration={universityForm.register(`campuses.${index}.name`)}
                />
                <Field
                  label="Razón social"
                  registration={universityForm.register(`campuses.${index}.legalName`)}
                />
                <Field
                  label="Provincia"
                  error={universityForm.formState.errors.campuses?.[index]?.province?.message}
                  registration={universityForm.register(`campuses.${index}.province`)}
                />
                <Field
                  label="Ciudad"
                  error={universityForm.formState.errors.campuses?.[index]?.city?.message}
                  registration={universityForm.register(`campuses.${index}.city`)}
                />
                <Field
                  label="Referencia"
                  registration={universityForm.register(`campuses.${index}.reference`)}
                />
                <button
                  className="remove-row-button"
                  type="button"
                  onClick={() => removeCampus(index)}
                  aria-label={`Quitar sede ${index + 1}`}
                >
                  Quitar
                </button>
              </div>
            ))}

            <div className="admin-section-heading">
              <div>
                <h3>Dominios autorizados</h3>
                <p>Incluye al menos un dominio general para la institución.</p>
              </div>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => domainFields.append({ domain: '', campusIndex: '' })}
              >
                Agregar dominio
              </button>
            </div>
            {domainFields.fields.map((domain, index) => (
              <div className="domain-row" key={domain.id}>
                <label className="field">
                  <span className="field-label">Dominio de correo</span>
                  <input
                    placeholder="@universidad.edu.ec"
                    aria-invalid={Boolean(
                      universityForm.formState.errors.domains?.[index]?.domain,
                    )}
                    {...universityForm.register(`domains.${index}.domain`)}
                  />
                  {universityForm.formState.errors.domains?.[index]?.domain?.message && (
                    <span className="field-error">
                      {universityForm.formState.errors.domains[index]?.domain?.message}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span className="field-label">Asignado a</span>
                  <select {...universityForm.register(`domains.${index}.campusIndex`)}>
                    <option value="">Dominio general</option>
                    {campusFields.fields.map((campus, campusIndex) => (
                      <option key={campus.id} value={String(campusIndex)}>
                        {watchedCampuses[campusIndex]?.name ||
                          `Sede ${campusIndex + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="remove-row-button"
                  type="button"
                  onClick={() => domainFields.remove(index)}
                  aria-label={`Quitar dominio ${index + 1}`}
                  disabled={domainFields.fields.length === 1}
                >
                  Quitar
                </button>
              </div>
            ))}
            {universityForm.formState.errors.domains?.root?.message && (
              <p className="field-error">{universityForm.formState.errors.domains.root.message}</p>
            )}
            <div className="button-row">
              <button className="button button-primary" type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Guardando…'
                  : selected
                    ? 'Guardar cambios'
                    : 'Crear universidad'}
              </button>
              {selected && selected.status !== 'INACTIVE' && (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void deactivate(selected)}
                >
                  Dar de baja
                </button>
              )}
              {selected?.status === 'INACTIVE' && (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void reactivate(selected)}
                >
                  {isSaving ? 'Reactivando…' : 'Reactivar universidad'}
                </button>
              )}
            </div>
          </form>

          {selected && selected.status !== 'INACTIVE' && (
            <section className="university-panel">
              <div className="university-panel-heading">
                <div>
                  <p className="eyebrow">Representación institucional</p>
                  <h2>Administradores locales</h2>
                </div>
              </div>
              {selected.administrators.length > 0 ? (
                <ul className="administrator-list">
                  {selected.administrators.map((administrator) => (
                    <li key={administrator.id}>
                      {administrator.avatarUrl && (
                        <img src={photoUrl(administrator.avatarUrl)} alt="" />
                      )}
                      <div>
                        <strong>{administrator.firstName} {administrator.lastName}</strong>
                        <span>{administrator.email}</span>
                        <small>{administratorStatus(administrator.status)}</small>
                      </div>
                      {administrator.status === 'PENDING_VERIFICATION' && (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void resendInvitation(administrator)}
                        >
                          Reenviar invitación
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-message">
                  Aún no hay representantes. La universidad seguirá pendiente hasta que uno acepte el cargo.
                </p>
              )}
              <form className="administrator-form" onSubmit={inviteAdministrator} noValidate>
                <h3>Invitar administrador local</h3>
                <p>
                  Se enviará al correo institucional un enlace de aceptación y configuración de contraseña.
                </p>
                <div className="form-grid">
                  <Field
                    label="Nombres"
                    error={administratorForm.formState.errors.firstName?.message}
                    registration={administratorForm.register('firstName')}
                  />
                  <Field
                    label="Apellidos"
                    error={administratorForm.formState.errors.lastName?.message}
                    registration={administratorForm.register('lastName')}
                  />
                  <Field
                    label="Correo institucional"
                    type="email"
                    error={administratorForm.formState.errors.email?.message}
                    registration={administratorForm.register('email')}
                  />
                  <Field
                    label="Dominio institucional"
                    placeholder="@universidad.edu.ec"
                    error={administratorForm.formState.errors.emailDomain?.message}
                    registration={administratorForm.register('emailDomain')}
                  />
                  <Field
                    label="Teléfono"
                    type="tel"
                    error={administratorForm.formState.errors.phone?.message}
                    registration={administratorForm.register('phone')}
                  />
                  <Field
                    label="Cargo institucional"
                    error={administratorForm.formState.errors.jobTitle?.message}
                    registration={administratorForm.register('jobTitle')}
                  />
                  <label className="field">
                    <span className="field-label">Sede por administrar</span>
                    <select {...administratorForm.register('campusId')}>
                      <option value="">Universidad completa</option>
                      {selected.campuses
                        .filter((campus) => campus.status === 'ACTIVE')
                        .map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Fotografía de perfil obligatoria</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      setPhoto(event.target.files?.[0] ?? null)
                    }}
                  />
                  <span className="field-hint">JPG, PNG o WebP; máximo 5 MB.</span>
                </label>
                <div className="button-row">
                  <button className="button button-primary" type="submit" disabled={isSaving}>
                    {isSaving ? 'Procesando…' : 'Enviar invitación'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </section>
      </div>
    </main>
    </AdminWorkspace>
  )
}

interface FieldProps {
  label: string
  registration: UseFormRegisterReturn
  error?: string
  type?: string
  placeholder?: string
}

function Field({
  label,
  registration,
  error,
  type = 'text',
  placeholder,
}: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        {...registration}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

function universityStatus(status: UniversityRecord['status']): string {
  if (status === 'ACTIVE') return 'Activa'
  if (status === 'INACTIVE') return 'Inactiva'
  return 'Pendiente de representante'
}

function administratorStatus(status: string): string {
  return status === 'ACTIVE' ? 'Cargo aceptado' : 'Invitación pendiente'
}

function photoUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

function campusIndexFor(
  campuses: UniversityRecord['campuses'],
  campusId: string | null,
): string {
  if (campusId === null) return ''
  const index = campuses.findIndex((campus) => campus.id === campusId)
  return index < 0 ? '' : String(index)
}
