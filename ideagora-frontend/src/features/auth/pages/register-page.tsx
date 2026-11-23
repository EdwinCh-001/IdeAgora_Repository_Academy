import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { authApi } from '../api/auth-api'
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from '../schemas/register-schema'
import type { RegistrationOptions } from '../types/auth-types'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { AuthBrandPanel } from '../components/auth-brand-panel'
import { NotificationModal } from '../../../shared/ui/notification-modal'
import { ArrowLeft } from 'lucide-react'
import { PasswordField } from '../components/password-field'
import { PasswordStrengthIndicator } from '../components/password-strength-indicator'

const initialValues: RegisterFormInput = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  facultyId: '',
  careerId: '',
  interestIds: [],
}

export function RegisterPage() {
  const [step, setStep] = useState(1)
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
  })
  const selectedFacultyId = useWatch({
    control: form.control,
    name: 'facultyId',
  })
  const selectedInterestIds = useWatch({
    control: form.control,
    name: 'interestIds',
  })
  const password = useWatch({ control: form.control, name: 'password' })
  const selectedFaculty = options?.faculties.find(
    (faculty) => faculty.id === selectedFacultyId,
  )

  const continueToAcademicInfo = async () => {
    setErrorMessage('')
    const valid = await form.trigger([
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
    ])
    if (!valid) return

    setIsLoading(true)
    try {
      const registrationOptions = await authApi.getRegistrationOptions(
        form.getValues('email'),
      )
      setOptions(registrationOptions)
      setStep(2)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudo validar la universidad. Inténtalo nuevamente.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const continueToInterests = async () => {
    setErrorMessage('')
    const valid = await form.trigger(['facultyId', 'careerId'])
    if (valid) setStep(3)
  }

  const submitRegistration = form.handleSubmit(async (values) => {
    setErrorMessage('')
    setIsLoading(true)
    try {
      const result = await authApi.register(values)
      setSuccessMessage(result.message)
    } catch (error) {
      setCanResendVerification(true)
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudo crear la cuenta. Inténtalo nuevamente.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  })

  const resendVerification = async () => {
    setErrorMessage('')
    setResendMessage('')
    setIsLoading(true)
    try {
      const result = await authApi.resendVerification(form.getValues('email'))
      setResendMessage(result.message)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudo enviar un nuevo enlace. Inténtalo nuevamente.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const toggleInterest = (interestId: string) => {
    const nextIds = selectedInterestIds.includes(interestId)
      ? selectedInterestIds.filter((id) => id !== interestId)
      : [...selectedInterestIds, interestId]
    form.setValue('interestIds', nextIds, { shouldValidate: true })
  }

  if (successMessage) {
    return (
      <main className="auth-shell">
        <AuthBrandPanel
          eyebrow="Ideas que conectan"
          title="La próxima gran idea empieza en comunidad."
          description="Encuentra proyectos, comparte conocimiento y crea impacto junto a tu comunidad universitaria."
        />
        <section className="auth-main">
          <div className="status-card" role="status">
            <a className="auth-home-link" href="/">
              <ArrowLeft size={16} aria-hidden="true" />
              Volver al inicio
            </a>
            <div className="status-icon" aria-hidden="true">✉</div>
            <p className="eyebrow">Un último paso</p>
            <h1>Revisa tu correo</h1>
            <p>{successMessage} Si no lo ves, revisa también la carpeta de spam.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <AuthBrandPanel
        eyebrow="Ideas que conectan"
        title="La próxima gran idea empieza en comunidad."
        description="Encuentra proyectos, comparte conocimiento y crea impacto junto a tu comunidad universitaria."
      />
      <section className="auth-main">
        <div className="auth-card">
          <a className="auth-home-link" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver al inicio
          </a>
          <p className="eyebrow">Únete a la comunidad</p>
          <h2>Crea tu cuenta</h2>
          <p className="card-intro">
            Conecta con personas e ideas que impulsan la investigación universitaria.
          </p>
          <div
            className="stepper"
            role="progressbar"
            aria-label="Progreso del registro"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={step}
          >
            {[1, 2, 3].map((number) => (
              <span
                className={`step-segment${step >= number ? ' is-active' : ''}`}
                key={number}
              />
            ))}
          </div>
          <p className="step-caption">Paso {step} de 3</p>

          {canResendVerification && (
            <div className="resend-section">
              <p className="field-hint">
                Si la cuenta quedó pendiente, puedes solicitar otro enlace cuando el correo esté disponible.
              </p>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void resendVerification()}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando…' : 'Reenviar correo de verificación'}
              </button>
              {resendMessage && (
                <p className="field-hint" role="status">{resendMessage}</p>
              )}
            </div>
          )}

          <form onSubmit={submitRegistration} noValidate>
            {step === 1 && (
              <>
                <div className="form-grid">
                  <TextField
                    label="Nombres"
                    placeholder="Tus nombres"
                    autoComplete="given-name"
                    registration={form.register('firstName')}
                    error={form.formState.errors.firstName?.message}
                  />
                  <TextField
                    label="Apellidos"
                    placeholder="Tus apellidos"
                    autoComplete="family-name"
                    registration={form.register('lastName')}
                    error={form.formState.errors.lastName?.message}
                  />
                </div>
                <TextField
                  label="Correo institucional"
                  placeholder="nombre@universidad.edu"
                  type="email"
                  autoComplete="email"
                  hint="Usaremos el dominio para validar que tu universidad esté activa."
                  registration={form.register('email')}
                  error={form.formState.errors.email?.message}
                />
                <PasswordField
                  label="Contraseña"
                  autoComplete="new-password"
                  placeholder="Crea una contraseña segura"
                  hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
                  registration={form.register('password')}
                  error={form.formState.errors.password?.message}
                />
                <PasswordStrengthIndicator password={password} />
                <PasswordField
                  label="Repite la contraseña"
                  autoComplete="new-password"
                  placeholder="Vuelve a escribir tu contraseña"
                  registration={form.register('confirmPassword')}
                  error={form.formState.errors.confirmPassword?.message}
                />
                <div className="button-row">
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={continueToAcademicInfo}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Validando universidad…' : 'Continuar'}
                  </button>
                </div>
              </>
            )}

            {step === 2 && options && (
              <>
                <div className="university-badge">
                  Universidad: {options.university.name}
                </div>
                <label className="field">
                  <span className="field-label">Facultad</span>
                  <select
                    {...form.register('facultyId', {
                      onChange: () => form.setValue('careerId', ''),
                    })}
                    aria-invalid={Boolean(form.formState.errors.facultyId)}
                  >
                    <option value="">Selecciona tu facultad</option>
                    {options.faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.facultyId?.message && (
                    <span className="field-error">
                      {form.formState.errors.facultyId.message}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span className="field-label">Carrera</span>
                  <select
                    {...form.register('careerId')}
                    disabled={!selectedFaculty}
                    aria-invalid={Boolean(form.formState.errors.careerId)}
                  >
                    <option value="">Selecciona tu carrera</option>
                    {selectedFaculty?.careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.careerId?.message && (
                    <span className="field-error">
                      {form.formState.errors.careerId.message}
                    </span>
                  )}
                </label>
                {options.faculties.length === 0 && (
                  <p className="form-error">
                    Esta universidad aún no tiene facultades disponibles para el registro.
                  </p>
                )}
                <div className="button-row">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    Atrás
                  </button>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={continueToInterests}
                    disabled={options.faculties.length === 0}
                  >
                    Continuar
                  </button>
                </div>
              </>
            )}

            {step === 3 && options && (
              <>
                <p className="group-label">
                  ¿Qué temas te interesan? <span className="field-hint">(opcional)</span>
                </p>
                <p className="field-hint">
                  Personaliza tu bienvenida y descubre proyectos afines.
                </p>
                <div className="interest-list">
                  {options.interests.map((interest) => (
                    <label className="interest-option" key={interest.id}>
                      <input
                        type="checkbox"
                        checked={selectedInterestIds.includes(interest.id)}
                        onChange={() => toggleInterest(interest.id)}
                      />
                      {interest.name}
                    </label>
                  ))}
                </div>
                {options.interests.length === 0 && (
                  <p className="field-hint">
                    Podrás agregar tus intereses más adelante desde tu perfil.
                  </p>
                )}
                <div className="button-row">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setStep(2)}
                  >
                    Atrás
                  </button>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
                  </button>
                </div>
              </>
            )}
          </form>
          <p className="auth-link">
            ¿Ya tienes cuenta? <a href="/login">Iniciar sesión</a>
          </p>
        </div>
      </section>
      <NotificationModal
        errorMessage={errorMessage}
        onClose={() => setErrorMessage('')}
      />
    </main>
  )
}

interface TextFieldProps {
  label: string
  placeholder: string
  autoComplete: string
  registration: UseFormRegisterReturn
  error?: string
  hint?: string
  type?: string
}

function TextField({
  label,
  placeholder,
  autoComplete,
  registration,
  error,
  hint,
  type = 'text',
}: TextFieldProps) {
  const id = registration.name
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...registration}
      />
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
      {!error && hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </label>
  )
}
