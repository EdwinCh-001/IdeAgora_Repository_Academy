import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { directorProfileReviewApi } from '../api/director-profile-api'
import {
  directorProfileReviewSchema,
  type DirectorProfileReviewFormValues,
} from '../schemas/director-profile-schema'
import type { DirectorReviewProfile } from '../types/director-profile'
import {
  AdminWorkspace,
  type AdminWorkspaceLink,
} from '../../../shared/ui/admin-workspace'
import { NotificationModal } from '../../../shared/ui/notification-modal'

interface DirectorProfileReviewPageProps {
  onBack: () => void
  onLogout: () => Promise<void>
  onManageUsers: () => void
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const initialReviewValues: DirectorProfileReviewFormValues = {
  decision: 'APPROVED',
  reason: '',
}

export function DirectorProfileReviewPage({
  onBack,
  onLogout,
  onManageUsers,
}: DirectorProfileReviewPageProps) {
  const [profiles, setProfiles] = useState<DirectorReviewProfile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const form = useForm<DirectorProfileReviewFormValues>({
    resolver: zodResolver(directorProfileReviewSchema),
    defaultValues: initialReviewValues,
    mode: 'onTouched',
  })
  const decision = useWatch({
    control: form.control,
    name: 'decision',
  })
  const selectedProfile =
    profiles.find(({ id }) => id === selectedId) ?? null
  const workspaceLinks: AdminWorkspaceLink[] = [
    {
      id: 'academic-structure',
      label: 'Estructura académica',
      onClick: onBack,
    },
    { id: 'director-review', label: 'Validar directores', active: true },
    { id: 'users', label: 'Usuarios', onClick: onManageUsers },
  ]

  const reload = async () => {
    try {
      const result = await directorProfileReviewApi.list()
      setProfiles(result)
      setSelectedId((current) =>
        current && result.some(({ id }) => id === current) ? current : null,
      )
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudieron cargar los perfiles pendientes.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void directorProfileReviewApi
      .list()
      .then((result) => {
        if (active) setProfiles(result)
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            getApiErrorMessage(
              error,
              'No se pudieron cargar los perfiles pendientes.',
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

  const selectProfile = (profile: DirectorReviewProfile) => {
    setSelectedId(profile.id)
    form.reset(initialReviewValues)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const submit = form.handleSubmit(async (values) => {
    if (!selectedProfile) return
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await directorProfileReviewApi.review(
        selectedProfile.id,
        values.decision,
        values.reason,
      )
      setProfiles((current) =>
        current.filter(({ id }) => id !== selectedProfile.id),
      )
      setSelectedId(null)
      form.reset(initialReviewValues)
      setSuccessMessage(
        values.decision === 'APPROVED'
          ? 'Hoja de vida aprobada.'
          : 'Hoja de vida rechazada. Se guardó la observación.',
      )
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo guardar la revisión.'),
      )
      await reload()
    } finally {
      setIsSaving(false)
    }
  })

  const download = async (
    profileId: string,
    documentId: string,
    fileName: string,
  ) => {
    setErrorMessage('')
    setDownloadingId(documentId)
    try {
      downloadBlob(
        await directorProfileReviewApi.downloadDocument(
          profileId,
          documentId,
        ),
        fileName,
      )
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo descargar el documento.'),
      )
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <AdminWorkspace roleLabel="Administrador local" links={workspaceLinks}>
    <main className="university-admin profile-review-admin">
      <header className="university-admin-header">
        <div>
          <p className="eyebrow">Administración local</p>
          <h1>Validación de directores</h1>
          <p>Revisa las hojas de vida de tu universidad o sede.</p>
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

      <div className="profile-review-layout">
        <section className="university-list-card">
          <div className="university-list-heading">
            <h2>Pendientes</h2>
            <span>{profiles.length}</span>
          </div>
          {isLoading ? (
            <p role="status">Cargando perfiles…</p>
          ) : profiles.length === 0 ? (
            <p>No hay hojas de vida pendientes de revisión.</p>
          ) : (
            <ul className="university-list">
              {profiles.map((profile) => (
                <li key={profile.id}>
                  <button
                    className={`university-list-item ${
                      selectedId === profile.id ? 'is-selected' : ''
                    }`}
                    type="button"
                    onClick={() => selectProfile(profile)}
                  >
                    <span>
                      {profile.director.firstName} {profile.director.lastName}
                    </span>
                    <small>{profile.director.email}</small>
                    <small>
                      {profile.director.universityName ?? 'Universidad'}
                      {profile.director.campusName
                        ? ` · ${profile.director.campusName}`
                        : ''}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="university-panel profile-review-detail">
          {!selectedProfile ? (
            <div className="academic-empty-panel">
              <p className="eyebrow">Revisión institucional</p>
              <h2>Selecciona una hoja de vida</h2>
              <p>
                Revisa la información y los documentos antes de aprobar o
                solicitar cambios.
              </p>
            </div>
          ) : (
            <>
              <div className="university-panel-heading">
                <div>
                  <p className="eyebrow">
                    {selectedProfile.director.universityName ?? ''}
                  </p>
                  <h2>
                    {selectedProfile.director.firstName}{' '}
                    {selectedProfile.director.lastName}
                  </h2>
                  <p>{selectedProfile.director.email}</p>
                </div>
              </div>
              <section className="review-profile-section">
                <h3>Resumen profesional</h3>
                <p>{selectedProfile.summary}</p>
              </section>
              <section className="review-profile-section">
                <h3>Áreas de especialización</h3>
                <ul>
                  {selectedProfile.specializations.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
              <section className="review-profile-section">
                <h3>Títulos académicos</h3>
                <ul>
                  {selectedProfile.academicDegrees.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
              <section className="review-profile-section">
                <h3>Experiencia laboral</h3>
                <ul>
                  {selectedProfile.workExperience.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
              <section className="review-profile-section">
                <h3>Enlaces profesionales</h3>
                {selectedProfile.externalLinks.length === 0 ? (
                  <p>Sin enlaces registrados.</p>
                ) : (
                  <ul>
                    {selectedProfile.externalLinks.map((link) => (
                      <li key={link}>
                        <a href={link} target="_blank" rel="noreferrer">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="review-profile-section">
                <h3>Documentos de respaldo</h3>
                {selectedProfile.documents.length === 0 ? (
                  <p>No se adjuntaron documentos.</p>
                ) : (
                  <ul className="profile-document-list">
                    {selectedProfile.documents.map((document) => (
                      <li key={document.id}>
                        <div>
                          <strong>{document.fileName}</strong>
                          <small>{formatBytes(document.sizeBytes)}</small>
                        </div>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={downloadingId === document.id}
                          onClick={() =>
                            void download(
                              selectedProfile.id,
                              document.id,
                              document.fileName,
                            )
                          }
                        >
                          {downloadingId === document.id
                            ? 'Descargando…'
                            : 'Descargar PDF'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <form className="profile-review-form" onSubmit={submit} noValidate>
                <label className="field">
                  <span className="field-label">Decisión</span>
                  <select {...form.register('decision')}>
                    <option value="APPROVED">Aprobar</option>
                    <option value="REJECTED">Rechazar y solicitar cambios</option>
                  </select>
                </label>
                {decision === 'REJECTED' && (
                  <label className="field">
                    <span className="field-label">Motivo del rechazo</span>
                    <textarea rows={3} {...form.register('reason')} />
                    {form.formState.errors.reason && (
                      <span className="field-error">
                        {form.formState.errors.reason.message}
                      </span>
                    )}
                  </label>
                )}
                <div className="button-row">
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando…' : 'Guardar revisión'}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
    </AdminWorkspace>
  )
}
