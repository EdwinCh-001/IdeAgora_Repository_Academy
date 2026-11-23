import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface PasswordFieldProps {
  label: string
  autoComplete: string
  registration: UseFormRegisterReturn
  error?: string
  hint?: string
  placeholder?: string
}

export function PasswordField({
  label,
  autoComplete,
  registration,
  error,
  hint,
  placeholder,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)
  const id = registration.name
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          {...registration}
        />
        <button
          className="password-visibility-toggle"
          type="button"
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
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
    </div>
  )
}
