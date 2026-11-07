import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
}

const inputClass =
  'w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 aria-[invalid=true]:border-rani'

function Help({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error)
    return (
      <p id={`${id}-error`} className="text-sm text-rani">
        {error}
      </p>
    )
  return hint ? <p className="text-xs text-muted">{hint}</p> : null
}

export function TextField({ label, error, hint, ...input }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        {...input}
      />
      <Help id={id} error={error} hint={hint} />
    </div>
  )
}

export function TextArea({ label, error, hint, ...input }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        rows={4}
        {...input}
      />
      <Help id={id} error={error} hint={hint} />
    </div>
  )
}

export function SelectField({
  label,
  error,
  hint,
  options,
  ...select
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <select id={id} aria-invalid={error ? true : undefined} className={inputClass} {...select}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Help id={id} error={error} hint={hint} />
    </div>
  )
}

/** A row of toggle chips. Each chip is a real button with aria-pressed. */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  error,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  error?: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={`min-h-10 rounded-full px-4 text-sm font-medium ${
                on ? 'bg-indigo-night text-white' : 'border border-sand bg-white text-ink hover:border-saffron'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-sm text-rani">{error}</p>}
    </fieldset>
  )
}

export function Button({
  busy,
  variant = 'primary',
  children,
  ...button
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: 'primary' | 'secondary' | 'dark' }) {
  const styles = {
    primary: 'bg-saffron text-white hover:bg-saffron-dark disabled:bg-muted/50',
    dark: 'bg-indigo-night text-white hover:bg-ink disabled:bg-muted/50',
    secondary: 'border border-sand bg-white text-ink hover:border-saffron disabled:text-muted',
  }[variant]
  return (
    <button
      {...button}
      disabled={busy || button.disabled}
      className={`min-h-11 rounded-full px-5 text-sm font-semibold ${styles} ${button.className ?? ''}`}
    >
      {busy ? 'Please wait…' : children}
    </button>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl border border-rani/30 bg-rani/5 px-3 py-2 text-sm text-rani">
      {message}
    </p>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-[0_10px_28px_rgba(30,26,82,0.08)] ${className}`}>{children}</div>
}
