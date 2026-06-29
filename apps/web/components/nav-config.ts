import type React from 'react'
import {
  Activity,
  BadgeDollarSign,
  Briefcase,
  Building2,
  Database,
  FolderKanban,
  FunctionSquare,
  KeyRound,
  Logs,
  Shield,
  Users,
  HardDrive,
  Lock,
  Cog,
  ScrollText,
  Wallet,
  CreditCard,
  BarChart3,
  Zap
} from 'lucide-react'

export type NavLeaf = { label: string; href: string; icon: React.ComponentType<{ size?: number }> }
export type NavSection = { title: string; items: NavLeaf[] }

export const navSections: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { label: 'Overview', href: '/', icon: Activity },
      { label: 'Projects', href: '/projects', icon: FolderKanban },
      { label: 'Organizations', href: '/organizations', icon: Building2 }
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      { label: 'Databases', href: '/platform/databases', icon: Database },
      { label: 'Auth', href: '/platform/auth', icon: Lock },
      { label: 'Storage', href: '/platform/storage', icon: HardDrive },
      { label: 'Functions', href: '/platform/functions', icon: FunctionSquare },
      { label: 'Jobs', href: '/platform/jobs', icon: Briefcase }
    ]
  },
  {
    title: 'Talocode Cloud',
    items: [
      { label: 'Wallet', href: '/billing', icon: Wallet },
      { label: 'Pricing', href: '/billing/plans', icon: CreditCard },
      { label: 'Usage', href: '/billing/usage', icon: BarChart3 },
      { label: 'API Keys', href: '/usage/api-keys', icon: KeyRound }
    ]
  },
  {
    title: 'Legacy Billing',
    items: [
      { label: 'Plans', href: '/billing/plans', icon: BadgeDollarSign },
      { label: 'Usage Billing', href: '/billing/usage', icon: ScrollText }
    ]
  },
  {
    title: 'Admin',
    items: [
      { label: 'Members', href: '/admin/members', icon: Users },
      { label: 'Settings', href: '/settings', icon: Cog },
      { label: 'Audit', href: '/admin/audit', icon: Shield }
    ]
  }
]
