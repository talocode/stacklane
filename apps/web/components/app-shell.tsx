'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Command,
  Menu,
  Plus,
  Search,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { navSections } from './nav-config'
import { apiClient } from '@/lib/api-client'
import type { User } from '@/lib/api-types'

const STORAGE_KEY = 'stacklane.nav.expanded'

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      setExpanded(JSON.parse(raw))
      return
    }

    setExpanded(Object.fromEntries(navSections.map((section) => [section.title, true])))
  }, [])

  useEffect(() => {
    if (Object.keys(expanded).length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded))
    }
  }, [expanded])

  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-body">
          {navSections.map((section) => {
            const isExpanded = expanded[section.title] ?? true
            return (
              <div key={section.title} className="nav-section">
                <button
                  className="nav-group-toggle"
                  onClick={() => setExpanded((prev) => ({ ...prev, [section.title]: !isExpanded }))}
                  aria-expanded={isExpanded}
                >
                  <span className="nav-label">{section.title}</span>
                  <ChevronDown size={14} className={`collapse-icon ${isExpanded ? 'open' : ''}`} />
                </button>
                <div className={`nav-group-items ${isExpanded ? 'expanded' : 'collapsed'}`}>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = path === item.href || path.startsWith(`${item.href}/`)
                    return (
                      <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
                        <Icon size={16} />
                        <span>{item.label}</span>
                        <ChevronRight size={14} className="chevron" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </aside>
      {open && <button className="overlay" onClick={onClose} aria-label="Close menu" />}
    </>
  )
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="palette-wrap" role="dialog" aria-modal="true" aria-label="Quick search">
      <button className="overlay palette-overlay" onClick={onClose} aria-label="Close quick search" />
      <div className="palette">
        <div className="palette-head">
          <Command size={16} />
          <input autoFocus placeholder="Quick search projects, orgs, pages" aria-label="Command palette search" />
          <button className="icon-btn" onClick={onClose} aria-label="Close palette">
            <X size={16} />
          </button>
        </div>
        <p className="palette-hint">Use Enter to jump. This is a UI placeholder for indexed command search.</p>
      </div>
    </div>
  )
}

function TopBar({
  onToggle,
  onOpenPalette,
  user,
  onLogout
}: {
  onToggle: () => void
  onOpenPalette: () => void
  user: User | null
  onLogout: () => Promise<void>
}) {
  return (
    <header className="topbar">
      <div className="left">
        <button className="icon-btn" onClick={onToggle} aria-label="Toggle navigation">
          <Menu size={18} />
        </button>
        <div className="wordmark">Stacklane Console</div>
      </div>
      <button className="search" onClick={onOpenPalette} aria-label="Open global search">
        <Search size={16} />
        <span>Search organizations, projects, pages</span>
        <kbd>⌘K</kbd>
      </button>
      <div className="right">
        <button className="icon-btn" aria-label="Quick actions">
          <Plus size={18} />
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button className="icon-btn" aria-label="Help">
          <CircleHelp size={18} />
        </button>
        <div className="user-block">
          <button className="avatar" aria-label="User menu">
            {(user?.name || 'SL').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </button>
          <div className="user-meta">
            <strong>{user?.name || 'Loading…'}</strong>
            <span>{user?.email || ''}</span>
          </div>
          <button className="icon-btn" onClick={onLogout} aria-label="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    apiClient.me().then(setUser).catch(() => router.push('/signin'))
  }, [router])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function logout() {
    await apiClient.logout()
    router.push('/signin')
  }

  return (
    <div className="shell">
      <TopBar onToggle={() => setDrawerOpen((v) => !v)} onOpenPalette={() => setPaletteOpen(true)} user={user} onLogout={logout} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <div className="shell-layout">
        <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main className="content" onClick={() => setDrawerOpen(false)}>
          {children}
        </main>
      </div>
    </div>
  )
}

export function PageScaffold({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  metadata,
  children
}: {
  title: string
  subtitle: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: ReactNode
  metadata?: ReactNode
  children: ReactNode
}) {
  const crumbItems = useMemo(
    () => [
      { label: 'Console', href: '/' },
      ...breadcrumbs
    ],
    [breadcrumbs]
  )

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <nav className="breadcrumbs" aria-label="Breadcrumbs">
            {crumbItems.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
                {index < crumbItems.length - 1 ? <ChevronRight size={12} /> : null}
              </span>
            ))}
          </nav>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {metadata ? <div className="meta-strip">{metadata}</div> : null}
        </div>
        <div className="page-actions">{actions}</div>
      </div>
      <div className="page-content">{children}</div>
    </section>
  )
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </article>
  )
}

export function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="meta-chip">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

export function StatusBadge({ value }: { value: 'healthy' | 'warning' | 'paused' }) {
  return <span className={`status ${value}`}>{value}</span>
}
