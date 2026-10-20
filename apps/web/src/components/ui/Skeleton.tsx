'use client'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'liquid-skeleton rounded-md',
        className
      )}
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3, className, ...props }: { lines?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="liquid-skeleton h-4 rounded" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-card p-5 flex flex-col gap-3', className)} {...props}>
      <div className="flex items-center gap-4">
        <div className="liquid-skeleton w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="liquid-skeleton h-4 w-3/4 rounded" />
          <div className="liquid-skeleton h-5 w-24 rounded-full" />
        </div>
      </div>
      <div className="liquid-skeleton h-3 w-1/2 rounded" />
    </div>
  )
}

export function SkeletonGrid({ count = 6, className, ...props }: { count?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}