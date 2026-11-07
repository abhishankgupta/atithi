import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { apiRequest, errorMessage, formError, getPrivate } from '../../lib/api'
import { Button, FormError, TextArea } from '../../components/Form'

export interface ThreadMessage {
  id: string
  senderName: string
  senderSide: 'TRAVELLER' | 'AGENCY'
  mine: boolean
  body: string
  createdAt: string
}

export interface Thread {
  matchId: string
  travellerName: string
  agencyName: string
  closed: boolean
  messages: ThreadMessage[]
}

/** The conversation between a traveller and one agency. Polls every 30 seconds while open. */
export function MessageThread({ matchId, title }: { matchId: string; title: string }) {
  const client = useQueryClient()
  const [body, setBody] = useState('')
  const thread = useQuery({
    queryKey: ['thread', matchId],
    queryFn: () => getPrivate<Thread>(`/api/v1/threads/${matchId}/messages`),
    refetchInterval: 30_000,
  })
  const send = useMutation({
    mutationFn: (text: string) =>
      apiRequest<Thread>(`/api/v1/threads/${matchId}/messages`, { body: { body: text }, auth: true }),
    onSuccess: (updated) => {
      client.setQueryData(['thread', matchId], updated)
      setBody('')
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (body.trim()) send.mutate(body.trim())
  }

  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {thread.isPending && <p className="text-sm text-muted">Loading messages…</p>}
      {thread.isError && <FormError message="Could not load messages." />}
      {thread.data && (
        <>
          {thread.data.messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
          <ol className="space-y-2">
            {thread.data.messages.map((m) => (
              <li
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.mine ? 'ml-auto bg-indigo-night text-white' : 'bg-sand text-ink'
                }`}
              >
                <p className="text-xs font-semibold opacity-80">{m.mine ? 'You' : m.senderName}</p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ol>
          {thread.data.closed ? (
            <p className="text-sm text-muted">This conversation is closed.</p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <TextArea
                label="Your message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                rows={3}
                error={errorMessage(send.error, 'body')}
              />
              <FormError message={formError(send.error, ['body'])} />
              <Button type="submit" variant="dark" busy={send.isPending} disabled={!body.trim()}>
                Send message
              </Button>
            </form>
          )}
        </>
      )}
    </section>
  )
}
