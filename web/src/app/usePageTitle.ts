import { useEffect } from 'react'

/** Sets the browser tab title. Pre-rendered pages get the same title in their HTML. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Atithi` : 'Atithi — travel India, your way'
  }, [title])
}
