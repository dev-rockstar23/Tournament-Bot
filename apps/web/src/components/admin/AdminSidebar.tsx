'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GitBranch, BarChart2, CreditCard,
  Settings, ChevronLeft, ChevronRight, LogOut, KeySquare, Shield,
} from 'lucide-react'
import { AppRole, roleName } from '@esports/permissions'
import { SyncStatusBadge } from './SyncStatusBadge'
import { StatusBar } from '@/components/ui/StatusBar'

interface NavItem { label: string; href: string; icon: React.ElementType; minRole: number; accent?: string }
interface AdminSidebarProps {
  guildId: string; guildName: string; guildIcon: string | null
  userRole: number; userName: string; userAvatar: string | null
}

const ROLE_COLORS: Record<string, string> = {
  SERVER_ADMIN:      '#ef4444',
  TOURNAMENT_MANAGER:'#f59e0b',
  REFEREE:           '#22d3ee',
  PLAYER:            '#22c55e',
  VIEWER:            '#64748b',
}

export function AdminSidebar({ guildId, guildName, guildIcon, userRole, userName, userAvatar }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navItems: NavItem[] = [
    { label: 'OVERVIEW',     href: `/servers/${guildId}/dashboard`,          icon: LayoutDashboard, minRole: AppRole.REFEREE,            accent: '#7c3aed' },
    { label: 'TOURNAMENTS',  href: `/servers/${guildId}/admin/tournaments`,  icon: GitBranch,       minRole: AppRole.TOURNAMENT_MANAGER, accent: '#22d3ee' },
    { label: 'ANALYTICS',    href: `/servers/${guildId}/admin/analytics`,    icon: BarChart2,       minRole: AppRole.REFEREE,            accent: '#9f5bff' },
    { label: 'PAYMENT OPS',  href: `/servers/${guildId}/admin/payment`,      icon: CreditCard,      minRole: AppRole.TOURNAMENT_MANAGER, accent: '#f59e0b' },
    { label: 'SETTINGS',     href: `/servers/${guildId}/admin/settings`,     icon: Settings,        minRole: AppRole.SERVER_ADMIN,       accent: '#ef4444' },
  ]

  const visibleItems = navItems.filter((i) => i.minRole <= userRole)
  const roleLabel = roleName(userRole as AppRole)
  const roleColor = ROLE_COLORS[roleLabel?.toUpperCase().replace(/[^A-Z_]/g, '_') ?? ''] ?? '#64748b'
  const shardId = `SHARD-${guildId.slice(-4).toUpperCase()}`

  return (
    <>
      <aside className="relative flex flex-col shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? '60px' : '196px',
          background: 'rgba(4,4,12,0.97)',
          borderRight: '1px solid rgba(124,58,237,0.12)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        }}>

        {/* Collapse toggle */}
        <button type="button" onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-8 z-20 flex size-6 items-center justify-center rounded-full transition-all hover:shadow-[0_0_12px_rgba(124,58,237,0.6)]"
          style={{ background: '#0d0d1a', border: '1px solid rgba(124,58,237,0.4)', color: '#7c3aed' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>

        {/* Brand header */}
        <div className="px-4 py-4 overflow-hidden"
          style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-[11px] font-black tracking-[0.22em] uppercase"
                  style={{ fontFamily: 'var(--font-orbitron)', color: '#7c3aed', textShadow: '0 0 10px rgba(124,58,237,0.7)' }}>
                  SHADØW
                </p>
                <p className="text-[8px] tracking-[0.15em] uppercase mt-0.5 text-[#334155]"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  ADMIN CONSOLE
                </p>
              </motion.div>
            ) : (
              <motion.p key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[9px] font-black text-center tracking-widest text-[#7c3aed]"
                style={{ fontFamily: 'var(--font-orbitron)' }}>
                SW
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Guild info */}
        <div className="flex items-center gap-2.5 px-3 py-3 overflow-hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {guildIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.webp?size=40`}
              alt={guildName} className="size-8 shrink-0 rounded-[8px] object-cover"
              style={{ border: '1px solid rgba(124,58,237,0.35)' }} />
          ) : (
            <div className="size-8 shrink-0 rounded-[8px] flex items-center justify-center font-bold text-xs text-white"
              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(6,182,212,0.4))', border: '1px solid rgba(124,58,237,0.35)' }}>
              {guildName.charAt(0).toUpperCase()}
            </div>
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-[#f1f5f9]">{guildName}</p>
                <p className="text-[8px] text-[#22d3ee] tracking-wider mt-0.5" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {shardId}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sync badge */}
        {!collapsed && <SyncStatusBadge guildId={guildId} />}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3" aria-label="Admin navigation">
          <ul className="flex flex-col gap-0.5 px-2">
            {visibleItems.map((item, i) => {
              const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
              const Icon = item.icon
              return (
                <motion.li key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}>
                  <Link href={item.href}
                    title={collapsed ? item.label : undefined}
                    className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[10px] tracking-[0.18em] uppercase transition-all duration-200"
                    style={{
                      fontFamily: 'var(--font-jetbrains)',
                      background: isActive ? `${item.accent}12` : 'transparent',
                      color: isActive ? item.accent : '#475569',
                      borderLeft: `2px solid ${isActive ? item.accent : 'transparent'}`,
                      boxShadow: isActive ? `inset 0 0 12px ${item.accent}10` : 'none',
                    }}>
                    <Icon size={13} style={{ color: isActive ? item.accent : undefined,
                      filter: isActive ? `drop-shadow(0 0 5px ${item.accent})` : undefined }}
                      className="shrink-0" />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="truncate">
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        </nav>

        {/* API Keys badge */}
        {!collapsed && (
          <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px]"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}>
              <KeySquare size={9} className="text-[#22d3ee] shrink-0" aria-hidden />
              <span className="text-[8px] tracking-[0.15em] uppercase text-[#22d3ee]"
                style={{ fontFamily: 'var(--font-jetbrains)' }}>
                KEYS SECURE
              </span>
            </div>
          </div>
        )}

        {/* User footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(124,58,237,0.1)' }}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName}
                className="size-7 shrink-0 rounded-full object-cover"
                style={{ border: '1px solid rgba(124,58,237,0.4)' }} />
            ) : (
              <div className="size-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-[#f1f5f9]">{userName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Shield size={8} style={{ color: roleColor }} />
                    <span className="text-[9px] font-semibold tracking-wider uppercase"
                      style={{ fontFamily: 'var(--font-jetbrains)', color: roleColor }}>
                      {roleLabel}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Link href="/api/auth/logout"
              className="ml-auto shrink-0 text-[#334155] hover:text-[#ef4444] transition-colors"
              title="Sign out">
              <LogOut size={13} />
            </Link>
          </div>
        </div>
      </aside>

      {userRole >= AppRole.REFEREE && <StatusBar shardOnline={true} />}
    </>
  )
}
