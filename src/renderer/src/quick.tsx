import type { FacetsResponse } from '@shared/ipc'
import type { Settings } from '@shared/types'
import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QuickInput, type QuickInputHandle } from './components/QuickInput'
import { api } from './lib/ui'
import './styles.css'

function QuickAddWindow() {
  const [facets, setFacets] = useState<FacetsResponse | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const inputRef = useRef<QuickInputHandle>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const load = async (): Promise<void> => {
    const [f, s] = await Promise.all([api.invoke('meta:facets'), api.invoke('settings:get')])
    setFacets(f)
    setSettings(s)
  }

  useEffect(() => {
    void load()
    const offs = [
      window.api.on('quick:focus', () => {
        void load()
        inputRef.current?.focus()
      }),
      window.api.on('settings:changed', setSettings)
    ]
    return () => offs.forEach((off) => off())
  }, [])

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => {
      void api.invoke('quick:resize', { height: Math.ceil(box.getBoundingClientRect().height) })
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const defaultAreaName = facets?.areas.find((a) => a.id === settings?.defaultAreaId)?.name ?? null

  return (
    <div ref={boxRef} className="rounded-xl border border-line bg-surface p-2.5">
      <QuickInput
        ref={inputRef}
        autoFocus
        compact
        knownAreas={facets?.areas.map((a) => a.name) ?? []}
        knownPeople={facets?.people.map((p) => p.name) ?? []}
        defaultAreaName={defaultAreaName}
        onAdded={() => void api.invoke('quick:close')}
        onEscape={() => void api.invoke('quick:close')}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuickAddWindow />
  </StrictMode>
)
