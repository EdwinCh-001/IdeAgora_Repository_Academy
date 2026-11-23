import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { authApi } from '../api/auth-api'
import { loginSchema, type LoginFormValues } from '../schemas/login-schema'
import type { AuthSession } from '../types/auth-types'
import { AuthBrandPanel } from '../components/auth-brand-panel'
import { NotificationModal } from '../../../shared/ui/notification-modal'
import { ArrowLeft } from 'lucide-react'
import { PasswordField } from '../components/password-field'

interface LoginPageProps {
  onLogin: (session: AuthSession) => void
  notice?: string
}

export function LoginPage({ onLogin, notice }: LoginPageProps) {
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  const submit = form.handleSubmit(async (credentials) => {
    setErrorMessage('')
    setIsLoading(true)
    try {
      onLogin(await authApi.login(credentials))
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo iniciar sesión. Inténtalo de nuevo.'),
      )
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <main className="auth-shell">
      <AuthBrandPanel
        eyebrow="Ideas que conectan"
        title="Tu comunidad académica te espera."
        description="Inicia sesión para continuar colaborando en proyectos e iniciativas universitarias."
      />
      <section className="auth-main">
        <div className="auth-card">
          <a className="auth-home-link" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver al inicio
          </a>
          <p className="eyebrow">Qué bueno verte</p>
          <h2>Iniciar sesión</h2>
          <p className="card-intro">
            Ingresa con las credenciales de tu cuenta de IdeAgora.
          </p>
          {notice && <p className="form-error" role="status">{notice}</p>}
          <form onSubmit={submit} noValidate>
            <label className="field" htmlFor="login-email">
              <span className="field-label">Correo electrónico</span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nombre@universidad.edu"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
              {form.formState.errors.email?.message && (
                <span className="field-error">
                  {form.formState.errors.email.message}
                </span>
              )}
            </label>
            <PasswordField
              label="Contraseña"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              registration={form.register('password')}
              error={form.formState.errors.password?.message}
            />
            <div className="button-row">
              <button
                className="button button-primary"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
              </button>
            </div>
          </form>
          <p className="auth-link">
            ¿Aún no tienes cuenta? <a href="/register">Crear cuenta</a>
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
