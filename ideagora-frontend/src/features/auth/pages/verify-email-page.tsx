import { useState } from 'react'
import { authApi } from '../api/auth-api'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { AuthBrandPanel } from '../components/auth-brand-panel'
import { NotificationModal } from '../../../shared/ui/notification-modal'

interface VerifyEmailPageProps {
  token: string
}

export function VerifyEmailPage({ token }: VerifyEmailPageProps) {
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const verify = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const result = await authApi.verifyEmail(token)
      setMessage(result.message)
      window.history.replaceState({}, '', window.location.pathname)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudo verificar el correo. Solicita un nuevo enlace.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const resend = async () => {
    setIsLoading(true)
    setErrorMessage('')
    setResendMessage('')
    try {
      const result = await authApi.resendVerification(email)
      setResendMessage(result.message)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'No se pudo enviar un nuevo enlace. Inténtalo más tarde.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <AuthBrandPanel
        eyebrow="Bienvenido/a"
        title="Tu comunidad académica te espera."
        description="Confirma tu correo para activar tu cuenta y comenzar."
      />
      <section className="auth-main">
        <div className="status-card">
          <div className="status-icon" aria-hidden="true">
            {message ? '✓' : '✉'}
          </div>
          <p className="eyebrow">Verificación de correo</p>
          <h1>{message ? '¡Cuenta activada!' : 'Activa tu cuenta'}</h1>
          <p role="status">
            {message ||
              'Confirma que esta dirección de correo institucional te pertenece.'}
          </p>
          {!message && (
            <div className="button-row">
              <button
                className="button button-primary"
                type="button"
                onClick={verify}
                disabled={isLoading || token.length !== 64}
              >
                {isLoading ? 'Verificando…' : 'Verificar correo'}
              </button>
            </div>
          )}
          {!message && (
            <div className="resend-section">
              <label className="field" htmlFor="resend-email">
                <span className="field-label">¿Necesitas otro enlace?</span>
                <input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@universidad.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                className="button button-secondary"
                type="button"
                onClick={resend}
                disabled={isLoading || !email.includes('@')}
              >
                Enviar nuevo enlace
              </button>
              {resendMessage && (
                <p className="field-hint" role="status">{resendMessage}</p>
              )}
            </div>
          )}
          {token.length !== 64 && !errorMessage && (
            <p className="field-error">El enlace de verificación no es válido.</p>
          )}
        </div>
      </section>
      <NotificationModal
        errorMessage={errorMessage}
        onClose={() => setErrorMessage('')}
      />
    </main>
  )
}
