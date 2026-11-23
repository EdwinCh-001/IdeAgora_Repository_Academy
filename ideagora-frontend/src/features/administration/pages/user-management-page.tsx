import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { userManagementApi } from '../api/user-management-api'
import {
  userManagementActionSchema,
  type UserManagementActionValues,
} from '../schemas/user-management-schema'
import type { ManagedUser, UserRole } from '../types/managed-user'
import {
  AdminWorkspace,
  type AdminWorkspaceLink,
} from '../../../shared/ui/admin-workspace'
import { NotificationModal } from '../../../shared/ui/notification-modal'

interface UserManagementPageProps {
  role: UserRole
  onBack: () => void
  onLogout: () => Promise<void>
  onReviewDirectors?: () => void
}

const initialValues: UserManagementActionValues = {
  confirmationName: '',
  password: '',
  reason: '',
  permanent: true,
  endsAt: '',
}

const roleLabels: Record<UserRole, string> = {
  ADMIN_GLOBAL: 'Administrador global',
  ADMIN_LOCAL: 'Administrador local',
  STUDENT: 'Estudiante',
  DIRECTOR: 'Director/a',
}

const statusLabels = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  PENDING_VERIFICATION: 'Pendiente de verificación',
} as const

function formatDate(value: string | null): string {
  if (!value) return 'Permanente'
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toLocalDateTimeInput(value: Date): string {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function UserManagementPage({
  role,
  onBack,
  onLogout,
  onReviewDirectors,
}: UserManagementPageProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [minimumEndAt] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 60_000)),
  )
  const form = useForm<UserManagementActionValues>({
    resolver: zodResolver(userManagementActionSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
  })
  const isPermanent = useWatch({
    control: form.control,
    name: 'permanent',
  })

  const loadUsers = async () => {
    try {
      const result = await userManagementApi.list()
      setUsers(result)
      setSelectedUser((current) =>
        current ? result.find(({ id }) => id === current.id) ?? null : null,
      )
      return true
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudieron cargar las cuentas.'),
      )
      return false
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void userManagementApi
      .list()
      .then((result) => {
        if (active) setUsers(result)
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            getApiErrorMessage(error, 'No se pudieron cargar las cuentas.'),
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

  const beginAction = (user: ManagedUser) => {
    setSelectedUser(user)
    form.reset(initialValues)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const submit = form.handleSubmit(async (values) => {
    if (!selectedUser) return
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    const commonPayload = {
      confirmationName: values.confirmationName,
      password: values.password,
      reason: values.reason,
    }
    try {
      if (selectedUser.status === 'ACTIVE') {
        await userManagementApi.suspend(selectedUser.id, {
          ...commonPayload,
          permanent: values.permanent,
          endsAt: values.permanent
            ? null
            : new Date(values.endsAt).toISOString(),
        })
        setSuccessMessage('La cuenta fue suspendida y se notificó por correo.')
      } else {
        await userManagementApi.reactivate(selectedUser.id, commonPayload)
        setSuccessMessage('La cuenta fue reactivada y se notificó por correo.')
      }
      setSelectedUser(null)
      form.reset(initialValues)
      await loadUsers()
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudo completar la acción. Revisa la conexión e inténtalo de nuevo.',
        ),
      )
      await loadUsers()
    } finally {
      setIsSaving(false)
    }
  })

  const isGlobalAdmin = role === 'ADMIN_GLOBAL'
  const workspaceLinks: AdminWorkspaceLink[] = isGlobalAdmin
    ? [
        { id: 'universities', label: 'Universidades', onClick: onBack },
        { id: 'users', label: 'Usuarios', active: true },
      ]
    : [
        {
          id: 'academic-structure',
          label: 'Estructura académica',
          onClick: onBack,
        },
        ...(onReviewDirectors
          ? [
              {
                id: 'director-review' as const,
                label: 'Validar directores',
                onClick: onReviewDirectors,
              },
            ]
          : []),
        { id: 'users', label: 'Usuarios', active: true },
      ]

  return (
    <AdminWorkspace
      roleLabel={isGlobalAdmin ? 'Administrador global' : 'Administrador local'}
      links={workspaceLinks}
    >
    <main className="university-admin user-management-admin">
      <header className="university-admin-header">
        <div>
          <p className="eyebrow">
            {isGlobalAdmin ? 'Administración global' : 'Administración local'}
          </p>
          <h1>Gestión de usuarios</h1>
          <p>
            {isGlobalAdmin
              ? 'Consulta cuentas y gestiona administradores locales y usuarios.'
              : 'Consulta y gestiona las cuentas de tu institución.'}
          </p>
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

      <section className="university-panel managed-users-panel">
        <div className="university-panel-heading">
          <h2>Cuentas administrables</h2>
          <span>{users.length} cuentas</span>
        </div>
        {isLoading ? (
          <p role="status">Cargando cuentas…</p>
        ) : users.length === 0 ? (
          <p>No hay cuentas disponibles para gestionar.</p>
        ) : (
          <div className="managed-user-list">
            {users.map((user) => {
              const fullName = `${user.firstName} ${user.lastName}`
              const canManage =
                user.status === 'ACTIVE' || user.status === 'SUSPENDED'
              return (
                <article className="managed-user-card" key={user.id}>
                  <div className="managed-user-details">
                    <h3>{fullName}</h3>
                    <p>{user.email}</p>
                    <div className="managed-user-meta">
                      <span>{roleLabels[user.role]}</span>
                      {user.universityName && (
                        <span>{user.universityName}</span>
                      )}
                      <span
                        className={`status-pill ${
                          user.status === 'ACTIVE'
                            ? 'is-active'
                            : user.status === 'SUSPENDED'
                              ? 'is-inactive'
                              : 'is-pending'
                        }`}
                      >
                        {statusLabels[user.status]}
                      </span>
                    </div>
                    {user.suspension && (
                      <p className="managed-user-suspension">
                        Motivo: {user.suspension.reason} · Finaliza:{' '}
                        {formatDate(user.suspension.endsAt)}
                      </p>
                    )}
                  </div>
                  <button
                    className={
                      user.status === 'ACTIVE'
                        ? 'button button-danger'
                        : 'button button-primary'
                    }
                    type="button"
                    disabled={!canManage}
                    onClick={() => beginAction(user)}
                  >
                    {user.status === 'ACTIVE'
                      ? 'Suspender'
                      : user.status === 'SUSPENDED'
                        ? 'Reactivar'
                        : 'No disponible'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {selectedUser && (
        <section
          className="university-panel user-action-panel"
          aria-labelledby="user-action-title"
        >
          <div className="university-panel-heading">
            <div>
              <p className="eyebrow">Confirmación de seguridad</p>
              <h2 id="user-action-title">
                {selectedUser.status === 'ACTIVE'
                  ? 'Suspender cuenta'
                  : 'Reactivar cuenta'}
              </h2>
            </div>
            <button
              className="button button-secondary"
              type="button"
              disabled={isSaving}
              onClick={() => setSelectedUser(null)}
            >
              Cancelar
            </button>
          </div>
          <p className="card-intro">
            Para confirmar, escribe el nombre completo mostrado y tu contraseña.
            Se enviará un correo al usuario con el motivo.
          </p>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Nombre exacto del usuario</span>
                <input
                  autoComplete="off"
                  {...form.register('confirmationName')}
                />
                {form.formState.errors.confirmationName && (
                  <span className="field-error">
                    {form.formState.errors.confirmationName.message}
                  </span>
                )}
              </label>
              <label className="field">
                <span className="field-label">Tu contraseña</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <span className="field-error">
                    {form.formState.errors.password.message}
                  </span>
                )}
              </label>
            </div>
            <label className="field">
              <span className="field-label">Motivo</span>
              <textarea rows={3} {...form.register('reason')} />
              {form.formState.errors.reason && (
                <span className="field-error">
                  {form.formState.errors.reason.message}
                </span>
              )}
            </label>
            {selectedUser.status === 'ACTIVE' && (
              <>
                <label className="managed-user-permanent">
                  <input type="checkbox" {...form.register('permanent')} />
                  <span>Suspensión permanente</span>
                </label>
                {!isPermanent && (
                  <label className="field managed-user-end-date">
                    <span className="field-label">
                      Fecha y hora de finalización
                    </span>
                    <input
                      type="datetime-local"
                      min={minimumEndAt}
                      {...form.register('endsAt')}
                    />
                    {form.formState.errors.endsAt && (
                      <span className="field-error">
                        {form.formState.errors.endsAt.message}
                      </span>
                    )}
                  </label>
                )}
              </>
            )}
            <div className="button-row">
              <button
                className={
                  selectedUser.status === 'ACTIVE'
                    ? 'button button-danger'
                    : 'button button-primary'
                }
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Procesando…'
                  : selectedUser.status === 'ACTIVE'
                    ? 'Confirmar suspensión'
                    : 'Confirmar reactivación'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
    </AdminWorkspace>
  )
}
