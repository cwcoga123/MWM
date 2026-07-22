import { useEffect, useRef, type ReactNode } from 'react'
import type { HubUser } from '../shell/AuthGate'
import { readCalculatorDraft, writeCalculatorDraft, type CalculatorDraft } from '../../lib/calculatorDrafts'

interface CalculatorDraftBoundaryProps {
  user: HubUser
  calculatorId: string
  children: ReactNode
}

function fieldKey(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  return field.id || field.name
}

function snapshot(root: HTMLElement): CalculatorDraft {
  const draft: CalculatorDraft = {}
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((field) => {
    const key = fieldKey(field)
    if (!key) return
    draft[key] = field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')
      ? String(field.checked)
      : field.value
  })
  return draft
}

function setNativeValue(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set
    setter?.call(field, value === 'true')
  } else {
    const prototype = field instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : field instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLTextAreaElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    setter?.call(field, value)
  }
}

export function CalculatorDraftBoundary({ user, calculatorId, children }: CalculatorDraftBoundaryProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let restoring = true
    const savedDraft = readCalculatorDraft(user.id, calculatorId)
    if (savedDraft) {
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((field) => {
        const key = fieldKey(field)
        if (!key || savedDraft[key] === undefined) return
        setNativeValue(field, savedDraft[key])
        field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
      })
    }

    const finishRestoring = window.requestAnimationFrame(() => {
      restoring = false
      writeCalculatorDraft(user.id, calculatorId, snapshot(root))
    })
    const persist = () => {
      if (!restoring) writeCalculatorDraft(user.id, calculatorId, snapshot(root))
    }
    root.addEventListener('input', persist)
    root.addEventListener('change', persist)

    return () => {
      window.cancelAnimationFrame(finishRestoring)
      root.removeEventListener('input', persist)
      root.removeEventListener('change', persist)
    }
  }, [calculatorId, user.id])

  return <div ref={rootRef} className="calculator-draft-boundary">{children}</div>
}

