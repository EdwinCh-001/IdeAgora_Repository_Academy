import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { authApi } from '../api/auth-api'
import {
  acceptAdminInvitationSchema,
  type AcceptAdminInvitationFormValues,
} from '../schemas/accept-admin-invitation-schema'
import { AuthBrandPanel } from '../components/auth-brand-panel'
import { NotificationModal } from '../../../shared/ui/notification-modal'
import { PasswordField } from '../components/password-field'

interface AcceptAdminInvitationPageProps {
  token: string
}

export function AcceptAdminInvitationPage({
  token,
}: AcceptAdminInvitationPageProps) {
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<AcceptAdminInvitationFormValues>({
    resolver: zodResolver(acceptAdminInvitationSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onTouched',
  })

  const submit = form.handleSubmit(async ({ password }) => {
    setErrorMessage('')
    setIsLoading(true)
    try {
      const result = await authApi.acceptAdminInvitation({ token, password })
      setMessage(result.message)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'No se pudo aceptar la invitación.'),
      )
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <main className="auth-shell">
      <AuthBrandPanel
        eyebrow="Representación institucional"
        title="Tu universidad cuenta contigo."
        description="Acepta la invitación y configura una contraseña segura."
      />
      <section className="auth-main">
        <div className="auth-card">
          {message ? (
            <>
              <p className="eyebrow">Invitación aceptada</p>
              <h2>Ya puedes iniciar sesión</h2>
              <p className="card-intro">{message}</p>
              <a className="button button-primary" href="/login">
                Ir a iniciar sesión
              </a>
            </>
          ) : (
            <>
              <p className="eyebrow">Invitación de administrador local</p>
              <h2>Aceptar cargo</h2>
              <p className="card-intro">
                Define una contraseña para activar tu cuenta institucional.
              </p>
              <form onSubmit={submit} noValidate>
                <PasswordField
                  label="Nueva contraseña"
                  autoComplete="new-password"
                  registration={form.register('password')}
                  error={form.formState.errors.password?.message}
                />
                <PasswordField
                  label="Confirmar contraseña"
                  autoComplete="new-password"
                  registration={form.register('confirmPassword')}
                  error={form.formState.errors.confirmPassword?.message}
                />
                <div className="button-row">
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Guardando…' : 'Aceptar e ingresar contraseña'}
                  </button>
                </div>
              </form>
            </>
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
