import { m } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  FileUser,
  LogOut,
  Sparkles,
} from 'lucide-react'
import type { AuthenticatedUser } from '../../auth/types/auth-types'
import { AuroraBackground, FlowLines } from '../../../shared/ui/ambient-background'

interface HomePageProps {
  user: AuthenticatedUser
  onExplore: () => void
  onManageProfile?: () => void
  onLogout: () => Promise<void>
}

export function HomePage({
  user,
  onExplore,
  onManageProfile,
  onLogout,
}: HomePageProps) {
  const firstName = user.firstName.trim().split(/\s+/)[0] || 'bienvenido'
  const roleLabel = user.role === 'DIRECTOR' ? 'Director/a' : 'Estudiante'

  return (
    <main className="home-page">
      <AuroraBackground />
      <header className="site-header home-header">
        <a className="brand brand-dark" href="/home" aria-label="IdeAgora, inicio">
          <span className="brand-mark" aria-hidden="true">
            i
          </span>
          <span>IdeAgora</span>
        </a>
        <nav className="home-navigation" aria-label="Navegación">
          <button type="button" onClick={onExplore}>
            <Compass size={16} aria-hidden="true" />
            Explorar
          </button>
          {onManageProfile && (
            <button type="button" onClick={onManageProfile}>
              <FileUser size={16} aria-hidden="true" />
              Hoja de vida
            </button>
          )}
        </nav>
        <div className="home-user-actions">
          <span className="home-user-chip">
            <span className="home-user-avatar" aria-hidden="true">
              {firstName.charAt(0).toUpperCase()}
            </span>
            <span className="home-user-name">
              <strong>{user.firstName} {user.lastName}</strong>
              <small>{roleLabel}</small>
            </span>
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={() => void onLogout()}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="home-hero page-container">
        <FlowLines />
        <m.div
          className="home-hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="welcome-kicker">
            <Sparkles size={15} aria-hidden="true" />
            Tu espacio académico
          </span>
          <h1>
            Hola, {firstName}<span>.</span>
          </h1>
          <p>
            Las ideas crecen cuando se comparten. Explora proyectos y encuentra
            nuevas formas de aportar a tu comunidad.
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={onExplore}
          >
            Explorar proyectos
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </m.div>
        <m.div
          className="home-hero-card"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <span className="home-hero-card-icon">
            <BookOpen size={22} aria-hidden="true" />
          </span>
          <span className="section-eyebrow">Comunidad IdeAgora</span>
          <h2>Investiga. Comparte. Transforma.</h2>
          <p>
            Un punto de encuentro para quienes quieren llevar el conocimiento
            más lejos.
          </p>
          <button className="text-link" type="button" onClick={onExplore}>
            Conocer proyectos
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </m.div>
      </section>

      <section className="home-actions page-container">
        <div className="home-section-heading">
          <div>
            <span className="section-eyebrow">Empieza por aquí</span>
            <h2>¿Qué te gustaría hacer?</h2>
          </div>
          <span className="home-section-note">Un paso a la vez, una idea a la vez.</span>
        </div>
        <div className={`home-action-grid${onManageProfile ? ' has-profile-action' : ''}`}>
          <m.button
            className="home-action-card"
            type="button"
            onClick={onExplore}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="home-action-icon home-action-icon-orange">
              <Compass size={21} aria-hidden="true" />
            </span>
            <span className="home-action-copy">
              <strong>Explorar proyectos</strong>
              <small>Encuentra ideas e iniciativas de la comunidad.</small>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </m.button>
          {onManageProfile && (
            <m.button
              className="home-action-card"
              type="button"
              onClick={onManageProfile}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.99 }}
            >
              <span className="home-action-icon home-action-icon-blue">
                <FileUser size={21} aria-hidden="true" />
              </span>
              <span className="home-action-copy">
                <strong>Gestionar hoja de vida</strong>
                <small>Completa tu trayectoria para validación institucional.</small>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </m.button>
          )}
        </div>
      </section>

      <footer className="home-footer page-container">
        <span>IdeAgora · {roleLabel}</span>
        <span>Construyendo conocimiento en comunidad.</span>
      </footer>
    </main>
  )
}
