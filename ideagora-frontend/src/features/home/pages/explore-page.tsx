import { m } from 'framer-motion'
import { ArrowLeft, ArrowRight, Compass, LogIn, Sparkles } from 'lucide-react'
import { AuroraBackground } from '../../../shared/ui/ambient-background'

interface ExplorePageProps {
  isAuthenticated: boolean
  onNavigate: (path: string) => void
}

export function ExplorePage({
  isAuthenticated,
  onNavigate,
}: ExplorePageProps) {
  return (
    <main className="explore-page">
      <AuroraBackground />
      <header className="site-header explore-header">
        <a
          className="brand brand-dark"
          href={isAuthenticated ? '/home' : '/'}
          onClick={(event) => {
            event.preventDefault()
            onNavigate(isAuthenticated ? '/home' : '/')
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            i
          </span>
          <span>IdeAgora</span>
        </a>
        <button
          className="button button-quiet"
          type="button"
          onClick={() => onNavigate(isAuthenticated ? '/home' : '/')}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {isAuthenticated ? 'Volver al inicio' : 'Volver a bienvenida'}
        </button>
      </header>
      <section className="explore-content page-container">
        <m.div
          className="explore-empty-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="explore-icon">
            <Compass size={25} aria-hidden="true" />
          </span>
          <span className="section-eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Explorar IdeAgora
          </span>
          <h1>Las ideas están tomando forma.</h1>
          <p>
            El catálogo de proyectos estará disponible aquí cuando se integre
            ese módulo. Mientras tanto, puedes conocer la plataforma y
            preparar tu cuenta.
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={() =>
              onNavigate(isAuthenticated ? '/home' : '/register')
            }
          >
            {isAuthenticated ? 'Ir a mi inicio' : 'Crear una cuenta'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {!isAuthenticated && (
            <button
              className="explore-login-link"
              type="button"
              onClick={() => onNavigate('/login')}
            >
              <LogIn size={15} aria-hidden="true" />
              Ya tengo cuenta
            </button>
          )}
        </m.div>
      </section>
    </main>
  )
}
