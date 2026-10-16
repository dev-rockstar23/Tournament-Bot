'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  CheckSquare,
  BarChart3,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { AppRole, roleName } from '@esports/permissions'
import { SyncStatusBadge } from './SyncStatusBadge'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  minRole: number
}

interface AdminSidebarProps {
  guildId: string
  guildName: string
  guildIcon: string | null
  userRole: number // AppRole numeric value
  userName: string
  userAvatar: string | null
}

export function AdminSidebar({
  guildId,
  guildName,
  guildIcon,
  userRole,
  userName,
  userAvatar,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      href: `/servers/${guildId}/dashboard`,
      icon: LayoutDashboard,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'Tournaments',
      href: `/servers/${guildId}/admin/tournaments`,
      icon: Trophy,
      minRole: AppRole.TOURNAMENT_MANAGER,
    },
    {
      label: 'Participants',
      href: `/servers/${guildId}/admin/participants`,
      icon: Users,
      minRole: AppRole.TOURNAMENT_MANAGER,
    },
    {
      label: 'Matches',
      href: `/servers/${guildId}/admin/matches`,
      icon: Calendar,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'Results',
      href: `/servers/${guildId}/admin/results`,
      icon: CheckSquare,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'Analytics',
      href: `/servers/${guildId}/admin/analytics`,
      icon: BarChart3,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'Settings',
      href: `/servers/${guildId}/admin/settings`,
      icon: Settings,
      minRole: AppRole.SERVER_ADMIN,
    },
    {
      label: 'Payments',
      href: `/servers/${guildId}/admin/payments`,
      icon: CreditCard,
      minRole: AppRole.SERVER_ADMIN,
    },
  ]

  const visibleItems = navItems.filter((item) => item.minRole <= userRole)

  const roleLabel = roleName(userRole as AppRole)

  return (
    <aside
      className="relative flex flex-col shrink-0 transition-all duration-300 border-r border-white/10"
      style={{
        width: collapsed ? '4rem' : '16rem',
        backgroundColor: 'var(--color-bg-secondary, rgba(15,15,25,0.95))',
      }}
    >
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[var(--color-bg-primary,#0f0f19)] text-white/60 hover:text-white transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Server header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 overflow-hidden">
        {guildIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.webp?size=40`}
            alt={guildName}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-bold text-white">
            {guildName.charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-white">{guildName}</span>
        )}
      </div>

      {/* Sync status badge */}
      {!collapsed && <SyncStatusBadge guildId={guildId} />}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Admin navigation">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[rgba(124,58,237,0.2)] border-l-2 border-[var(--color-accent,#7c3aed)] text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white border-l-2 border-transparent',
                  ].join(' ')}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 overflow-hidden">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatar}
              alt={userName}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-violet-400">{roleLabel}</p>
            </div>
          )}

          <Link
            href="/auth/signout"
            className="ml-auto shrink-0 text-white/40 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </Link>
        </div>
      </div>
    </aside>
  )
}
