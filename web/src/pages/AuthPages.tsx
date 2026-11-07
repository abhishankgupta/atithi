import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { usePageTitle } from '../app/usePageTitle'
import { Button, Card, FormError, TextField } from '../components/Form'
import { authApi, type AccountType } from '../features/auth/authApi'
import { safeNext } from '../features/auth/safeNext'
import { errorMessage, formError } from '../lib/api'
import { useSession } from '../lib/session'

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <Card className="mt-6">{children}</Card>
    </section>
  )
}

export function LoginPage() {
  usePageTitle('Sign in')
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const signIn = useSession((s) => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (auth) => {
      signIn(auth)
      navigate(next, { replace: true })
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <AuthShell title="Sign in">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={errorMessage(login.error)} />
        <Button type="submit" busy={login.isPending} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New to Atithi?{' '}
        <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-saffron-dark underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  usePageTitle('Create an account')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const signIn = useSession((s) => s.signIn)
  const [accountType, setAccountType] = useState<AccountType>(params.get('type') === 'agent' ? 'AGENT' : 'TRAVELLER')
  const [form, setForm] = useState({ displayName: '', email: '', password: '', country: '' })
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (auth) => {
      signIn(auth)
      const next = accountType === 'AGENT' ? '/agent' : safeNext(params.get('next'))
      navigate(`/verify-email?next=${encodeURIComponent(next)}`, { replace: true })
    },
  })
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    register.mutate({ ...form, country: form.country || undefined, accountType })
  }

  return (
    <AuthShell title="Create an account">
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold">I am</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ['TRAVELLER', 'A traveller'],
                ['AGENT', 'A travel agent'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={accountType === value}
                onClick={() => setAccountType(value)}
                className={`min-h-11 rounded-xl text-sm font-semibold ${
                  accountType === value ? 'bg-indigo-night text-white' : 'border border-sand bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <TextField
          label="Your name"
          autoComplete="name"
          required
          minLength={2}
          value={form.displayName}
          onChange={set('displayName')}
          error={errorMessage(register.error, 'displayName')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          error={errorMessage(register.error, 'email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters"
          value={form.password}
          onChange={set('password')}
          error={errorMessage(register.error, 'password')}
        />
        <TextField label="Country (optional)" autoComplete="country-name" value={form.country} onChange={set('country')} />
        <FormError message={formError(register.error, ['displayName', 'email', 'password'])} />
        <Button type="submit" busy={register.isPending} className="w-full">
          Create account
        </Button>
        {accountType === 'AGENT' && (
          <p className="text-xs text-muted">Next you'll add your agency's details. We verify every agency before it receives requests.</p>
        )}
      </form>
    </AuthShell>
  )
}

export function VerifyEmailPage() {
  usePageTitle('Verify your email')
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const restoring = useSession((s) => s.restoring)
  const updateUser = useSession((s) => s.updateUser)
  const [code, setCode] = useState('')
  const send = useMutation({ mutationFn: authApi.sendCode })
  const verify = useMutation({
    mutationFn: authApi.verify,
    onSuccess: (me) => {
      updateUser({ emailVerified: me.emailVerified })
      navigate(next, { replace: true })
    },
  })

  if (restoring) return <p className="mx-auto max-w-md px-4 py-10 text-muted">Signing you in…</p>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent('/verify-email?next=' + next)}`} replace />
  if (user.emailVerified) return <Navigate to={next} replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    verify.mutate(code.trim())
  }

  return (
    <AuthShell title="Verify your email">
      <p className="text-sm text-muted">
        We'll send a 6-digit code to <strong className="text-ink">{user.email}</strong>. Agents only see your requests once
        your email is verified.
      </p>
      <Button type="button" variant="dark" className="mt-4" busy={send.isPending} onClick={() => send.mutate()}>
        {send.isSuccess ? 'Send a new code' : 'Send code'}
      </Button>
      {send.data?.testCode && (
        <p role="status" className="mt-3 rounded-xl bg-marigold-light/50 px-3 py-2 text-sm">
          Test mode — no emails are sent yet. Your code is <strong>{send.data.testCode}</strong>.
        </p>
      )}
      {send.isSuccess && !send.data.testCode && (
        <p role="status" className="mt-3 text-sm text-peacock">
          Code sent. Check your inbox.
        </p>
      )}
      <FormError message={errorMessage(send.error)} />
      <form onSubmit={submit} className="mt-4 space-y-3">
        <TextField
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <FormError message={errorMessage(verify.error)} />
        <Button type="submit" busy={verify.isPending} disabled={code.trim().length !== 6} className="w-full">
          Verify
        </Button>
      </form>
    </AuthShell>
  )
}
