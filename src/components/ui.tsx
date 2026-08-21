import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-surface rounded-2xl border border-border p-4', className)} {...props}>
      {children}
    </div>
  )
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  const variants = {
    primary: 'bg-accent text-black font-semibold hover:brightness-110',
    secondary: 'bg-surface-2 text-text border border-border hover:border-accent',
    ghost: 'bg-transparent text-text-dim hover:text-text',
    danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 rounded-xl',
    lg: 'px-6 py-3.5 text-lg rounded-xl',
  }
  return <button className={clsx('transition disabled:opacity-40 disabled:cursor-not-allowed', variants[variant], sizes[size], className)} {...props} />
}

export function NumberField({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={clsx('flex flex-col gap-1', className)}>
      {label && <span className="text-xs text-text-dim">{label}</span>}
      <input
        type="number"
        inputMode="decimal"
        className="bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-text text-center w-full focus:outline-none focus:border-accent"
        {...props}
      />
    </label>
  )
}

export function TextField({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={clsx('flex flex-col gap-1', className)}>
      {label && <span className="text-xs text-text-dim">{label}</span>}
      <input className="bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-text w-full focus:outline-none focus:border-accent" {...props} />
    </label>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'warn' | 'danger' }) {
  const tones = {
    default: 'bg-surface-2 text-text-dim',
    accent: 'bg-accent/15 text-accent',
    warn: 'bg-warn/15 text-warn',
    danger: 'bg-danger/15 text-danger',
  }
  return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tones[tone])}>{children}</span>
}

export function SegmentedControl<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex bg-surface-2 rounded-xl p-1 border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition',
            value === opt.value ? 'bg-accent text-black' : 'text-text-dim hover:text-text'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-10 text-text-dim">
      <p className="font-medium text-text">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  )
}
