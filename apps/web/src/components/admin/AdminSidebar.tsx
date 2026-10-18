'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  KeyRound,
  AlertTriangle,
  GitBranch,
  Radio,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  KeySquare,
} from 'lucide-react'
import { AppRole, roleName } from '@esports/permissions'
import { SyncStatusBadge } from './SyncStatusBadge'
import { Badge } from '@/components/ui/Badge'
import { StatusBar } from '@/components/ui/StatusBar'
import { staggerChildren, scaleIn } from '@/lib/motion'

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
      label: 'OVERVIEW',
      href: `/servers/${guildId}/dashboard`,
      icon: LayoutDashboard,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'ROOMS & CREDS',
      href: `/servers/${guildId}/admin/rooms`,
      icon: KeyRound,
      minRole: AppRole.TOURNAMENT_MANAGER,
    },
    {
      label: 'ROSTER DISPUTES',
      href: `/servers/${guildId}/admin/disputes`,
      icon: AlertTriangle,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'BRACKET ENGINE',
      href: `/servers/${guildId}/admin/tournaments`,
      icon: GitBranch,
      minRole: AppRole.TOURNAMENT_MANAGER,
    },
    {
      label: 'BROADCAST HUD',
      href: `/servers/${guildId}/admin/broadcast`,
      icon: Radio,
      minRole: AppRole.REFEREE,
    },
    {
      label: 'TENANT CONFIG',
      href: `/servers/${guildId}/admin/settings`,
      icon: Settings,
      minRole: AppRole.SERVER_ADMIN,
    },
  ]

  const visibleItems = navItems.filter((item) => item.minRole <= userRole)
  const roleLabel = roleName(userRole as AppRole)

  // Derive a shard ID deterministically from guildId for display
  const shardId = guildId ? `SHARD-${guildId.slice(-4).toUpperCase()}` : 'SHARD-0000'

  return (
    <>
      <aside
        className="relative flex flex-col shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? '64px' : '200px',
          backgroundColor: '#0d0d18',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(124,58,237,0.4)] bg-[#0d0d18] text-[#7c3aed] hover:text-white hover:border-[#7c3aed] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* ── CONTROL_NEXUS header ── */}
        <div
          className="px-4 py-4 overflow-hidden"
          style={{ borderBottom: '1px solid rgba(124,58,237,0.15)' }}
        >
          {!collapsed ? (
            <>
              <p
                className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase"
                style={{ color: '#7c3aed', textShadow: '0 0 8px rgba(124,58,237,0.7)' }}
              >
                CONTROL_NEXUS
              </p>
              <p
                className="text-[9px] font-mono tracking-[0.12em] uppercase mt-0.5"
                style={{ color: 'rgba(124,58,237,0.6)' }}
              >
                v3.42
              </p>
            </>
          ) : (
            <p
              className="text-[9px] font-mono font-bold tracking-wider uppercase text-center"
              style={{ color: '#7c3aed' }}
            >
              CN
            </p>
          )}
        </div>

        {/* ── Guild + shard info ── */}
        <div
          className="flex items-center gap-2.5 px-3 py-3 overflow-hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          {guildIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.webp?size=40`}
              alt={guildName}
              className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-[rgba(124,58,237,0.5)]"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-700/40 border border-[rgba(124,58,237,0.5)] text-xs font-bold text-white">
              {guildName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-white leading-tight">{guildName}</p>
              <p className="text-[9px] font-mono text-[rgba(6,182,212,0.6)] tracking-wider mt-0.5">{shardId}</p>
            </div>
          )}
        </div>

        {/* Sync status badge */}
        {!collapsed && <SyncStatusBadge guildId={guildId} />}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Admin navigation">
          <motion.ul
            className="space-y-0.5 px-2"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname?.startsWith(item.href + '/') ?? false)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[10px] font-mono tracking-widest uppercase transition-colors',
                      isActive
                        ? 'text-white border-l-2 border-[#7c3aed]'
                        : 'text-white/40 hover:text-white border-l-2 border-transparent hover:bg-white/5',
                    ].join(' ')}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'rgba(124,58,237,0.15)',
                            boxShadow: 'inset 3px 0 8px rgba(124,58,237,0.2)',
                          }
                        : undefined
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <motion.span variants={scaleIn} className="shrink-0">
                      <Icon
                        size={14}
                        style={
                          isActive
                            ? { color: '#7c3aed', filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.8))' }
                            : undefined
                        }
                      />
                    </motion.span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </motion.ul>
        </nav>

        {/* ── API KEYS badge ── */}
        {!collapsed && (
          <div
            className="px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm bg-[rgba(6,182,212,0.06)] border border-[rgba(6,182,212,0.2)]">
              <KeySquare size={10} className="text-[#06b6d4] shrink-0" aria-hidden="true" />
              <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-[#06b6d4]">
                API KEYS SECURE
              </span>
            </div>
          </div>
        )}

        {/* ── User footer ── */}
        <div
          className="p-3"
          style={{ borderTop: '1px solid rgba(6,182,212,0.15)' }}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={userName}
                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-[rgba(124,58,237,0.4)]"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-700/40 border border-[rgba(124,58,237,0.4)] text-xs font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-white leading-tight">{userName}</p>
                <Badge variant="cyber" className="mt-0.5 text-[9px]">
                  {roleLabel}
                </Badge>
              </div>
            )}

            <Link
              href="/auth/signout"
              className="ml-auto shrink-0 text-white/30 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </Link>
          </div>
        </div>
      </aside>

      {/* StatusBar visible to referees+ */}
      {userRole >= AppRole.REFEREE && (
        <StatusBar shardOnline={true} />
      )}
    </>
  )
}
