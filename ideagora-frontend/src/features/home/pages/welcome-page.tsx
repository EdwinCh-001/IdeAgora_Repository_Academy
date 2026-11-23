import { m } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Compass,
  GraduationCap,
  Lightbulb,
  Network,
  Search,
  Sparkles,
} from 'lucide-react'
import { AuroraBackground, FlowLines } from '../../../shared/ui/ambient-background'

interface WelcomePageProps {
  onNavigate: (path: string) => void
}

const services = [
  {
    icon: Search,
    title: 'Descubre proyectos',
    description:
      'Explora iniciativas académicas y encuentra temas que conecten contigo.',
  },
  {
    icon: Network,
    title: 'Conecta con tu comunidad',
    description:
      'Acerca a estudiantes, docentes y universidades alrededor de nuevas ideas.',
  },
  {
    icon: BookOpenCheck,
    title: 'Comparte conocimiento',
    description:
      'Da espacio a la investigación y a la colaboración universitaria.',
  },
]

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  return (
    <main className="welcome-page">
      <AuroraBackground />
      <header className="site-header">
        <a
          className="brand brand-dark"
          href="/"
          aria-label="IdeAgora, inicio"
          onClick={(event) => {
            event.preventDefault()
            onNavigate('/')
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            i
          </span>
          <span>IdeAgora</span>
        </a>

        <nav className="welcome-navigation" aria-label="Navegación principal">
          <a href="#about">Sobre nosotros</a>
          <a href="#services">Servicios</a>
          <button type="button" onClick={() => onNavigate('/projects')}>
            Explorar
          </button>
        </nav>

        <div className="welcome-header-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={() => onNavigate('/login')}
          >
            Iniciar sesión
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => onNavigate('/register')}
          >
            Regístrate
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="welcome-hero page-container">
        <FlowLines />
        <m.div
          className="welcome-hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <span className="welcome-kicker">
            <Sparkles size={15} aria-hidden="true" />
            Una comunidad para ideas que mueven
          </span>
          <h1>
            La próxima gran idea empieza <span>en comunidad.</span>
          </h1>
          <p>
            Conecta con personas, proyectos y oportunidades que impulsan la
            investigación universitaria.
          </p>
          <div className="welcome-hero-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => onNavigate('/register')}
            >
              Crear mi cuenta
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button
              className="button button-outline"
              type="button"
              onClick={() => onNavigate('/projects')}
            >
              <Compass size={17} aria-hidden="true" />
              Explorar proyectos
            </button>
          </div>
          <div className="welcome-proof">
            <span className="proof-avatar proof-avatar-one">
              <GraduationCap size={16} aria-hidden="true" />
            </span>
            <span className="proof-avatar proof-avatar-two">
              <Lightbulb size={15} aria-hidden="true" />
            </span>
            <span className="proof-avatar proof-avatar-three">
              <Network size={15} aria-hidden="true" />
            </span>
            <p>Un espacio para aprender, proponer y colaborar.</p>
          </div>
        </m.div>

        <m.div
          className="welcome-hero-art"
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
          aria-label="Ilustración de colaboración académica"
          role="img"
        >
          <div className="hero-art-orbit hero-art-orbit-one" />
          <div className="hero-art-orbit hero-art-orbit-two" />
          <div className="hero-art-center">
            <span className="hero-art-mark">i</span>
            <span>Ideas en movimiento</span>
          </div>
          <div className="hero-float-card hero-float-card-top">
            <span className="hero-card-icon hero-card-icon-orange">
              <Lightbulb size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>Investiga</strong>
              <small>Convierte preguntas en proyectos</small>
            </span>
          </div>
          <div className="hero-float-card hero-float-card-bottom">
            <span className="hero-card-icon hero-card-icon-blue">
              <Network size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>Colabora</strong>
              <small>Encuentra personas afines</small>
            </span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </div>
          <span className="hero-art-spark hero-art-spark-one">✳</span>
          <span className="hero-art-spark hero-art-spark-two">✦</span>
        </m.div>
        <a className="welcome-scroll-link" href="#about">
          Descubre IdeAgora
          <ArrowDown size={15} aria-hidden="true" />
        </a>
      </section>

      <section className="welcome-about page-container" id="about">
        <m.div
          className="welcome-section-heading"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45 }}
        >
          <span className="section-eyebrow">Sobre nosotros</span>
          <h2>El conocimiento crece cuando se encuentra.</h2>
          <p>
            IdeAgora acerca a la comunidad universitaria para que las ideas
            puedan convertirse en investigación, colaboración e impacto.
          </p>
        </m.div>
        <div className="welcome-about-note">
          <span className="about-note-icon">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <div>
            <strong>Una comunidad académica abierta</strong>
            <p>
              Explora iniciativas publicadas y únete a una red que valora el
              aprendizaje compartido.
            </p>
          </div>
        </div>
      </section>

      <section className="welcome-services" id="services">
        <div className="page-container">
          <div className="welcome-section-heading welcome-services-heading">
            <span className="section-eyebrow">Servicios</span>
            <h2>Todo empieza con una buena conexión.</h2>
            <p>
              Herramientas para descubrir oportunidades y dar forma a ideas
              junto a tu comunidad.
            </p>
          </div>
          <div className="service-grid">
            {services.map(({ icon: Icon, title, description }, index) => (
              <m.article
                className="service-card"
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <span className={`service-icon service-icon-${index + 1}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </m.article>
            ))}
          </div>
        </div>
      </section>

      <section className="welcome-final-cta page-container">
        <div>
          <span className="section-eyebrow">Tu siguiente paso</span>
          <h2>Tu próxima idea puede empezar hoy.</h2>
          <p>Únete a IdeAgora y descubre lo que puedes crear en comunidad.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => onNavigate('/register')}
        >
          Regístrate gratis
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>

      <footer className="site-footer">
        <a className="brand brand-dark" href="/" aria-label="IdeAgora, inicio">
          <span className="brand-mark" aria-hidden="true">
            i
          </span>
          <span>IdeAgora</span>
        </a>
        <span>Ideas que conectan. Conocimiento que transforma.</span>
        <button type="button" onClick={() => onNavigate('/login')}>
          Iniciar sesión
        </button>
      </footer>
    </main>
  )
}
