import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Download,
  FileBadge,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  LogOut,
  Send,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { directorProfileApi } from '../api/director-profile-api'
import {
  directorProfileSchema,
  type DirectorProfileFormValues,
} from '../schemas/director-profile-schema'
import type {
  DirectorProfile,
  DirectorProfileDraft,
} from '../types/director-profile'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { NotificationModal } from '../../../shared/ui/notification-modal'

interface DirectorProfilePageProps {
  directorName: string
  onBack: () => void
  onLogout: () => Promise<void>
}

const emptyValues: DirectorProfileFormValues = {
  summary: '',
  specializationsText: '',
  academicDegreesText: '',
  workExperienceText: '',
  externalLinksText: '',
}

const profileSteps = [
  {
    title: 'Tu perfil',
    description: 'Presenta tu trayectoria en pocas palabras.',
    icon: UserRound,
  },
  {
    title: 'Formación',
    description: 'Comparte tus áreas y títulos académicos.',
    icon: GraduationCap,
  },
  {
    title: 'Experiencia',
    description: 'Cuéntanos dónde has aportado.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Enviar',
    description: 'Agrega respaldos y envía a validación.',
    icon: Send,
  },
]

function toLines(values: string[]): string {
  return values.join('\n')
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function toProfileDraft(
  values: DirectorProfileFormValues,
): DirectorProfileDraft {
  return {
    summary: values.summary.trim(),
    specializations: parseLines(values.specializationsText),
    academicDegrees: parseLines(values.academicDegreesText),
    workExperience: parseLines(values.workExperienceText),
    externalLinks: parseLines(values.externalLinksText),
  }
}

function toFormValues(profile: DirectorProfile): DirectorProfileFormValues {
  return {
    summary: profile.summary,
    specializationsText: toLines(profile.specializations),
    academicDegreesText: toLines(profile.academicDegrees),
    workExperienceText: toLines(profile.workExperience),
    externalLinksText: toLines(profile.externalLinks),
  }
}

function firstIncompleteStep(profile: DirectorProfile | null): number {
  if (!profile || profile.summary.trim().length < 10) return 0
  if (!profile.specializations.length || !profile.academicDegrees.length) return 1
  if (!profile.workExperience.length) return 2
  return 3
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const validationLabels = {
  PENDING: 'Pendiente de validación',
  APPROVED: 'Validada',
  REJECTED: 'Requiere cambios',
} as const

export function DirectorProfilePage({
  directorName,
  onBack,
  onLogout,
}: DirectorProfilePageProps) {
  const [profile, setProfile] = useState<DirectorProfile | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [stepError, setStepError] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const form = useForm<DirectorProfileFormValues>({
    resolver: zodResolver(directorProfileSchema),
    defaultValues: emptyValues,
    mode: 'onTouched',
  })
  const summaryLength = useWatch({
    control: form.control,
    name: 'summary',
  }).length

  useEffect(() => {
    let active = true
    void directorProfileApi
      .get()
      .then((result) => {
        if (!active) return
        setProfile(result)
        if (result) form.reset(toFormValues(result))
        const startStep = firstIncompleteStep(result)
        setActiveStep(startStep)
        setMaxStep(startStep)
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            getApiErrorMessage(error, 'No se pudo cargar tu hoja de vida.'),
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [form])

  const continueStep = async () => {
    setStepError('')
    setErrorMessage('')

    if (activeStep === 0 && !(await form.trigger('summary'))) return

    if (activeStep === 1) {
      const values = form.getValues()
      if (!parseLines(values.specializationsText).length) {
        setStepError('Agrega al menos un área de especialización.')
        return
      }
      if (!parseLines(values.academicDegreesText).length) {
        setStepError('Agrega al menos un título académico.')
        return
      }
    }

    if (activeStep === 2) {
      if (!parseLines(form.getValues('workExperienceText')).length) {
        setStepError('Agrega al menos una experiencia laboral.')
        return
      }
      if (!(await form.trigger('externalLinksText'))) return
    }

    const nextStep = Math.min(activeStep + 1, profileSteps.length - 1)
    setActiveStep(nextStep)
    setMaxStep((current) => Math.max(current, nextStep))
  }

  const chooseStep = (step: number) => {
    if (step > maxStep) return
    setStepError('')
    setErrorMessage('')
    setActiveStep(step)
  }

  const selectDocument = (file: File | null) => {
    setSelectedFile(file)
    setErrorMessage('')
    setSuccessMessage('')
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('El documento no puede superar 10 MB.')
      return
    }
    if (
      file.type !== 'application/pdf' ||
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setErrorMessage('Selecciona un archivo PDF válido.')
    }
  }

  const submitProfile = form.handleSubmit(async (values) => {
    const draft = toProfileDraft(values)
    if (!draft.specializations.length || !draft.academicDegrees.length) {
      setActiveStep(1)
      setMaxStep((current) => Math.max(current, 1))
      setStepError('Completa tus áreas de especialización y títulos académicos.')
      return
    }
    if (!draft.workExperience.length) {
      setActiveStep(2)
      setMaxStep((current) => Math.max(current, 2))
      setStepError('Agrega al menos una experiencia laboral para continuar.')
      return
    }
    if (
      selectedFile &&
      (selectedFile.size > 10 * 1024 * 1024 ||
        selectedFile.type !== 'application/pdf' ||
        !selectedFile.name.toLowerCase().endsWith('.pdf'))
    ) {
      setErrorMessage('Selecciona un archivo PDF válido de máximo 10 MB.')
      return
    }

    setErrorMessage('')
    setStepError('')
    setSuccessMessage('')
    setIsSaving(true)
    let savedProfile: DirectorProfile
    try {
      savedProfile = await directorProfileApi.save(draft)
      setProfile(savedProfile)
      form.reset(toFormValues(savedProfile))
      setMaxStep(profileSteps.length - 1)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo guardar la hoja de vida.'),
      )
      setIsSaving(false)
      return
    }

    if (selectedFile) {
      try {
        const updatedProfile =
          await directorProfileApi.uploadDocument(selectedFile)
        setProfile(updatedProfile)
        setSelectedFile(null)
        setFileInputKey((current) => current + 1)
      } catch (error) {
        setErrorMessage(
          `La hoja se guardó, pero no se pudo adjuntar el documento. ${getApiErrorMessage(error, 'Inténtalo nuevamente.')}`,
        )
        setIsSaving(false)
        return
      }
    }

    setSuccessMessage(
      'Tu hoja de vida fue enviada. El administrador de tu institución la revisará.',
    )
    setIsSaving(false)
  }, (errors) => {
    if (errors.summary) {
      setActiveStep(0)
      setStepError(errors.summary.message ?? 'Completa tu resumen profesional.')
    } else if (errors.externalLinksText) {
      setActiveStep(2)
      setStepError(
        errors.externalLinksText.message ??
          'Revisa que tus enlaces sean direcciones HTTP o HTTPS válidas.',
      )
    }
  })

  const download = async (documentId: string, fileName: string) => {
    setErrorMessage('')
    setDownloadingId(documentId)
    try {
      downloadBlob(
        await directorProfileApi.downloadDocument(documentId),
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

  if (isLoading) {
    return (
      <main className="university-admin profile-admin profile-wizard-page">
        <p className="profile-loading" role="status">
          Preparando tu espacio profesional…
        </p>
      </main>
    )
  }

  const StepIcon = profileSteps[activeStep].icon

  return (
    <main className="university-admin profile-admin profile-wizard-page">
      <header className="university-admin-header profile-wizard-header">
        <div>
          <button
            className="profile-back-link"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a mi inicio
          </button>
          <p className="eyebrow">Espacio profesional · {directorName}</p>
          <h1>Tu hoja de vida, paso a paso</h1>
          <p>
            Organiza tu trayectoria y envíala al administrador de tu institución
            para validación.
          </p>
        </div>
        <button
          className="button button-quiet"
          type="button"
          onClick={() => void onLogout()}
        >
          <LogOut size={16} aria-hidden="true" />
          Cerrar sesión
        </button>
      </header>

      <NotificationModal
        errorMessage={errorMessage}
        successMessage={successMessage}
        onClose={() => {
          setErrorMessage('')
          setSuccessMessage('')
        }}
      />

      {profile && (
        <section className="profile-review-status" aria-live="polite">
          <span className="profile-review-status-icon">
            {profile.validationStatus === 'APPROVED' ? (
              <BadgeCheck size={20} aria-hidden="true" />
            ) : (
              <FileBadge size={20} aria-hidden="true" />
            )}
          </span>
          <div>
            <span className="section-eyebrow">Estado de tu perfil</span>
            <strong>{validationLabels[profile.validationStatus]}</strong>
            <p>
              {profile.validationStatus === 'PENDING'
                ? 'Tu información está en la cola de revisión de tu institución.'
                : profile.validationStatus === 'APPROVED'
                  ? 'Tu perfil profesional fue validado.'
                  : 'Revisa la observación y actualiza la información necesaria.'}
            </p>
            {profile.rejectionReason && (
              <p className="profile-rejection-note">
                Observación: {profile.rejectionReason}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="profile-wizard-card">
        <div className="profile-stepper-heading">
          <div>
            <span className="section-eyebrow">Tu progreso</span>
            <h2>Paso {activeStep + 1} de {profileSteps.length}</h2>
          </div>
          <span className="profile-step-count">
            {Math.round(((activeStep + 1) / profileSteps.length) * 100)}%
          </span>
        </div>
        <div
          className="profile-step-progress"
          role="progressbar"
          aria-label="Progreso de la hoja de vida"
          aria-valuemin={1}
          aria-valuemax={profileSteps.length}
          aria-valuenow={activeStep + 1}
        >
          <span style={{ width: `${((activeStep + 1) / profileSteps.length) * 100}%` }} />
        </div>
        <ol className="profile-step-list">
          {profileSteps.map(({ title, icon: Icon }, index) => (
            <li
              className={[
                index === activeStep ? 'is-current' : '',
                index < activeStep ? 'is-complete' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={title}
            >
              <button
                type="button"
                onClick={() => chooseStep(index)}
                disabled={index > maxStep}
                aria-current={index === activeStep ? 'step' : undefined}
                aria-label={`Paso ${index + 1}: ${title}`}
              >
                <span className="profile-step-icon">
                  {index < activeStep ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Icon size={16} aria-hidden="true" />
                  )}
                </span>
                <span>{title}</span>
              </button>
            </li>
          ))}
        </ol>

        <form className="profile-step-form" onSubmit={submitProfile} noValidate>
          <m.section
            className="profile-step-content"
            key={activeStep}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
            aria-labelledby="profile-step-title"
          >
              <div className="profile-step-intro">
                <span className="profile-step-large-icon">
                  <StepIcon size={22} aria-hidden="true" />
                </span>
                <div>
                  <span className="section-eyebrow">
                    Paso {activeStep + 1}
                  </span>
                  <h2 id="profile-step-title">
                    {profileSteps[activeStep].title}
                  </h2>
                  <p>{profileSteps[activeStep].description}</p>
                </div>
              </div>

              {activeStep === 0 && (
                <div className="profile-step-fields">
                  <label className="field">
                    <span className="field-label">Resumen profesional</span>
                    <span className="field-hint">
                      Describe tu trayectoria, fortalezas y el aporte que
                      puedes brindar a un proyecto.
                    </span>
                    <textarea
                      rows={7}
                      maxLength={3000}
                      placeholder="Soy profesional en… Mi experiencia se enfoca en…"
                      {...form.register('summary')}
                      aria-invalid={Boolean(form.formState.errors.summary)}
                    />
                    <span className="profile-character-count">
                      {summaryLength} / 3000
                    </span>
                    {form.formState.errors.summary && (
                      <span className="field-error">
                        {form.formState.errors.summary.message}
                      </span>
                    )}
                  </label>
                  <div className="profile-tip">
                    <Sparkles size={17} aria-hidden="true" />
                    <p>
                      Consejo: empieza con tu especialidad y destaca el tipo de
                      proyectos en los que te gustaría participar.
                    </p>
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="profile-step-fields profile-fields-grid">
                  <label className="field">
                    <span className="field-label">Áreas de especialización</span>
                    <span className="field-hint">
                      Escribe una especialidad por línea.
                    </span>
                    <textarea
                      rows={6}
                      placeholder={'Investigación educativa\nGestión de proyectos'}
                      {...form.register('specializationsText')}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Títulos académicos</span>
                    <span className="field-hint">
                      Incluye título, institución y año si lo deseas.
                    </span>
                    <textarea
                      rows={6}
                      placeholder={'Doctorado en ... · Universidad · 2022\nMaestría en ...'}
                      {...form.register('academicDegreesText')}
                    />
                  </label>
                </div>
              )}

              {activeStep === 2 && (
                <div className="profile-step-fields profile-fields-grid">
                  <label className="field">
                    <span className="field-label">Experiencia laboral</span>
                    <span className="field-hint">
                      Una experiencia por línea; puedes agregar tantas como
                      necesites.
                    </span>
                    <textarea
                      rows={6}
                      placeholder={'Cargo · Institución · Periodo · Aporte'}
                      {...form.register('workExperienceText')}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">
                      Enlaces a perfiles profesionales
                      <span className="field-hint"> · Opcional</span>
                    </span>
                    <span className="field-hint">
                      Añade un enlace HTTP o HTTPS por línea.
                    </span>
                    <textarea
                      rows={6}
                      placeholder={'https://www.linkedin.com/in/tu-perfil'}
                      {...form.register('externalLinksText')}
                    />
                    {form.formState.errors.externalLinksText && (
                      <span className="field-error">
                        {form.formState.errors.externalLinksText.message}
                      </span>
                    )}
                  </label>
                </div>
              )}

              {activeStep === 3 && (
                <div className="profile-step-fields profile-submit-step">
                  <div className="profile-submit-summary">
                    <span className="profile-submit-summary-icon">
                      <BadgeCheck size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>Tu información profesional está lista para revisión</strong>
                      <p>
                        Puedes adjuntar respaldos en PDF. Este paso es opcional;
                        al enviar, el administrador recibirá tu perfil.
                      </p>
                    </div>
                  </div>
                  <label className="profile-file-picker">
                    <span className="profile-file-icon">
                      <Upload size={19} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Adjunta un documento de respaldo</strong>
                      <small>Solo PDF · máximo 10 MB</small>
                      {selectedFile && (
                        <small className="profile-selected-file">
                          {selectedFile.name} · {formatBytes(selectedFile.size)}
                        </small>
                      )}
                    </span>
                    <span className="button button-outline profile-file-button">
                      Elegir PDF
                    </span>
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) =>
                        selectDocument(event.currentTarget.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {profile && profile.documents.length > 0 && (
                    <div className="profile-saved-documents">
                      <h3>Documentos adjuntos</h3>
                      <ul className="profile-document-list">
                        {profile.documents.map((document) => (
                          <li key={document.id}>
                            <span className="profile-document-icon">
                              <FileText size={17} aria-hidden="true" />
                            </span>
                            <div>
                              <strong>{document.fileName}</strong>
                              <small>
                                {formatBytes(document.sizeBytes)} ·{' '}
                                {formatDate(document.uploadedAt)}
                              </small>
                            </div>
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Descargar ${document.fileName}`}
                              title="Descargar documento"
                              disabled={downloadingId === document.id}
                              onClick={() =>
                                void download(document.id, document.fileName)
                              }
                            >
                              <Download size={17} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="profile-submit-note">
                    <LinkIcon size={16} aria-hidden="true" />
                    <span>
                      {profile
                        ? 'Al guardar cambios, la revisión se reinicia y el perfil vuelve a quedar pendiente.'
                        : 'Al enviar, tu perfil quedará pendiente hasta que lo revise tu institución.'}
                    </span>
                  </div>
                </div>
              )}

              {stepError && (
                <p className="form-error profile-step-error" role="alert">
                  {stepError}
                </p>
              )}
          </m.section>

          <div className="profile-step-actions">
            <button
              className="button button-outline"
              type="button"
              onClick={() => chooseStep(activeStep - 1)}
              disabled={activeStep === 0 || isSaving}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Anterior
            </button>
            {activeStep < profileSteps.length - 1 ? (
              <button
                className="button button-primary"
                type="button"
                onClick={() => void continueStep()}
              >
                Continuar
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="button button-primary"
                type="submit"
                disabled={isSaving}
              >
                <Send size={16} aria-hidden="true" />
                {isSaving
                  ? 'Enviando…'
                  : profile
                    ? 'Guardar y enviar a revisión'
                    : 'Enviar a validación'}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
