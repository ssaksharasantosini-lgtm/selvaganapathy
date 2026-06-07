import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  badge?: { text: string; type: 'green' | 'red' | 'yellow' | 'blue' | 'orange' }
  subtitle?: string
}

export default function StatCard({ label, value, icon: Icon, iconColor = 'text-brand-400', iconBg = 'bg-brand-500/10', trend, badge, subtitle }: StatCardProps) {
  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {badge && (
          <span className={`badge-${badge.type}`}>{badge.text}</span>
        )}
      </div>

      <div>
        <p className="label mb-1">{label}</p>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>

      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
          <span className="text-slate-500 font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
