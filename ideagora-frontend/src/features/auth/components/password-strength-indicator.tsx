import { AnimatePresence, m } from 'framer-motion'

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const checks = [
    password.length >= 10,
    password.length >= 14,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const level = score >= 5 ? 3 : score >= 3 ? 2 : 1
  const label =
    level === 3 ? 'Muy segura' : level === 2 ? 'Seguridad media' : 'No segura'

  return (
    <div className="password-strength" aria-live="polite" aria-atomic="true">
      <div
        className="password-strength-track"
        role="progressbar"
        aria-label="Seguridad de la contraseña"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={level}
        aria-valuetext={label}
      >
        <m.span
          className={`password-strength-fill is-level-${level}`}
          animate={{ width: `${(level / 3) * 100}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <m.p
          key={level}
          className={`password-strength-label is-level-${level}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {label}
        </m.p>
      </AnimatePresence>
    </div>
  )
}
