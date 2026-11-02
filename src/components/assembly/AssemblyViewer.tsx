'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid'

import { createAssemblyScene, type AssemblyScene } from '@/components/assembly/scene'
import { lastStep, steps } from '@/components/assembly/steps'
import { cn } from '@/lib/utils'

/** How long each step stays on screen while playing */
const playDelay = 2600

const panelClass = 'rounded-2xl border border-border bg-card p-4 sm:p-6 dark:bg-muted/40'

const roundButton =
  'flex size-11 flex-none items-center justify-center rounded-full border border-border text-foreground transition hover:bg-muted disabled:opacity-30'

export function AssemblyViewer() {
  let viewer = useRef<HTMLDivElement>(null)
  let scene = useRef<AssemblyScene | null>(null)
  let [step, setStep] = useState(0)
  let [playing, setPlaying] = useState(false)
  let [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!viewer.current) return
    scene.current = createAssemblyScene(viewer.current, {
      onLoad: () => setStatus('ready'),
      onError: () => setStatus('error'),
    })
    return () => {
      scene.current?.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => {
    scene.current?.goTo(step)
  }, [step, status])

  // Play: the next step after a pause, until the nalichnik is ready
  useEffect(() => {
    if (!playing || status !== 'ready') return
    let timer = setTimeout(
      () => {
        setStep(step + 1)
        if (step + 1 >= lastStep) setPlaying(false)
      },
      step === 0 ? 900 : playDelay,
    )
    return () => clearTimeout(timer)
  }, [playing, step, status])

  function togglePlay() {
    if (!playing && step >= lastStep) setStep(0)
    setPlaying(!playing)
  }

  function go(next: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(lastStep, next)))
  }

  let current = steps[step]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="sticky top-2 z-10 space-y-3 lg:top-24">
        <div
          ref={viewer}
          className="relative h-[52dvh] overflow-hidden rounded-2xl bg-[#e4e0d9] shadow-lg ring-1 ring-border sm:h-[60dvh] lg:h-[min(44rem,calc(100dvh-14rem))] lg:shadow-none"
        >
          {status !== 'ready' && (
            <div className="absolute inset-0 grid place-items-center text-sm font-medium text-[#3f3a33]">
              {status === 'loading' ? 'Загружаю наличник…' : 'Не получилось загрузить модель'}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl bg-white/85 px-4 py-3 text-[#18181b] backdrop-blur-sm sm:right-auto sm:max-w-md">
            <p className="text-xs font-semibold text-[#71717a]">
              {step === 0 ? 'Начало' : `Шаг ${String(step).padStart(2, '0')} из ${lastStep}`}
            </p>
            <p className="mt-0.5 text-sm font-semibold sm:text-base">{current.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className={roundButton} aria-label="Предыдущий шаг">
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={status !== 'ready'}
            className="flex size-12 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/80 disabled:opacity-40"
            aria-label={playing ? 'Пауза' : 'Показать сборку'}
          >
            {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5 translate-x-px" />}
          </button>
          <button type="button" onClick={() => go(step + 1)} disabled={step === lastStep} className={roundButton} aria-label="Следующий шаг">
            <ChevronRightIcon className="size-5" />
          </button>
          <input
            type="range"
            min={0}
            max={lastStep}
            step={1}
            value={step}
            onChange={(e) => go(Number(e.target.value))}
            className="min-w-0 flex-1 accent-foreground"
            aria-label="Шаг сборки"
          />
        </div>
      </div>

      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-xs font-semibold text-muted-foreground">
            {step === 0 ? 'Начало' : `Шаг ${String(step).padStart(2, '0')}`}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{current.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{current.text}</p>
          <Link
            href="/instructions/zlynka"
            className="mt-4 inline-block text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition hover:decoration-foreground"
          >
            Инструкция с фото каждого шага
          </Link>
        </section>

        <section className={panelClass}>
          <h2 className="text-sm font-semibold text-foreground">Все шаги</h2>
          <ol className="mt-3 space-y-0.5">
            {steps.map((s) => (
              <li key={s.number}>
                <button
                  type="button"
                  onClick={() => go(s.number)}
                  aria-current={s.number === step ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-baseline gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition',
                    s.number === step
                      ? 'bg-foreground text-background'
                      : s.number < step
                        ? 'text-muted-foreground hover:bg-muted/60'
                        : 'text-foreground hover:bg-muted/60',
                  )}
                >
                  <span className="w-5 flex-none text-xs tabular-nums opacity-70">
                    {s.number === 0 ? '·' : String(s.number).padStart(2, '0')}
                  </span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
