import type { ReactNode } from 'react'
import {
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export type AdminWorkspaceSection =
  | 'universities'
  | 'academic-structure'
  | 'director-review'
  | 'users'

export interface AdminWorkspaceLink {
  id: AdminWorkspaceSection
  label: string
  active?: boolean
  onClick?: () => void
}

interface AdminWorkspaceProps {
  roleLabel: string
  links: AdminWorkspaceLink[]
  children: ReactNode
}

const sectionIcons: Record<AdminWorkspaceSection, LucideIcon> = {
  universities: Building2,
  'academic-structure': BookOpenCheck,
  'director-review': ClipboardCheck,
  users: UsersRound,
}

export function AdminWorkspace({
  roleLabel,
  links,
  children,
}: AdminWorkspaceProps) {
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="IdeAgora">
          <span className="admin-brand-mark" aria-hidden="true">i</span>
          <span>IdeAgora</span>
        </a>
        <div className="admin-sidebar-profile">
          <span className="admin-sidebar-overline">ÁREA DE TRABAJO</span>
          <strong>Administración</strong>
          <span>{roleLabel}</span>
        </div>
        <nav className="admin-sidebar-nav" aria-label="Panel de administración">
          <span className="admin-sidebar-overline">GESTIÓN</span>
          {links.map(({ id, label, active = false, onClick }) => {
            const Icon = sectionIcons[id]
            return (
              <button
                className={`admin-sidebar-link${active ? ' is-active' : ''}`}
                type="button"
                key={id}
                aria-current={active ? 'page' : undefined}
                disabled={!onClick}
                onClick={onClick}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-security-mark" aria-hidden="true">✓</span>
          <span>
            <strong>Espacio seguro</strong>
            <small>Actividad institucional</small>
          </span>
        </div>
      </aside>
      <div className="admin-workspace-content">{children}</div>
    </div>
  )
}
