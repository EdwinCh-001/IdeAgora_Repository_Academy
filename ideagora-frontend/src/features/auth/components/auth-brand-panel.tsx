import { m } from 'framer-motion'

interface AuthBrandPanelProps {
  eyebrow: string
  title: string
  description: string
  footer?: string
}

export function AuthBrandPanel({
  eyebrow,
  title,
  description,
  footer = 'Una comunidad para investigar, crear y colaborar.',
}: AuthBrandPanelProps) {
  return (
    <m.aside
      className="auth-aside auth-brand-panel"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
    >
      <div className="auth-aside-visual" aria-hidden="true" />
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">i</span>
        <span>IdeAgora</span>
      </div>
      <div className="aside-copy">
        <p className="aside-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <p className="aside-footer">{footer}</p>
    </m.aside>
  )
}
