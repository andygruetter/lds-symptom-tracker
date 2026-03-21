'use client'

import { useState, useEffect, useCallback } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw } from 'lucide-react'

// Brand colors from the app
const colors = {
  bg: '#F2EDE7',
  fg: '#3D3530',
  primary: '#C4692E',
  primaryLight: '#E8A065',
  card: '#FFFFFF',
  border: '#D9D0C5',
  success: '#2D8B6F',
  destructive: '#C43838',
  muted: '#A09890',
  doctorBg: '#F5F7FA',
  doctorPrimary: '#4A5E78',
  doctorAccent: '#3B9B8F',
}

type Scene =
  | 'idle'
  | 'problem'
  | 'solution'
  | 'ai'
  | 'insights'
  | 'doctor'
  | 'cta'

const SCENE_DURATIONS: Record<Exclude<Scene, 'idle'>, number> = {
  problem: 3200,
  solution: 4000,
  ai: 5000,
  insights: 5000,
  doctor: 4500,
  cta: 3500,
}

const SCENE_ORDER: Exclude<Scene, 'idle'>[] = [
  'problem',
  'solution',
  'ai',
  'insights',
  'doctor',
  'cta',
]

export function DemoAnimation() {
  const [scene, setScene] = useState<Scene>('idle')
  const [sceneIndex, setSceneIndex] = useState(-1)

  const startAnimation = useCallback(() => {
    setSceneIndex(0)
    setScene(SCENE_ORDER[0])
  }, [])

  useEffect(() => {
    if (sceneIndex < 0 || sceneIndex >= SCENE_ORDER.length) return

    const currentScene = SCENE_ORDER[sceneIndex]
    const duration = SCENE_DURATIONS[currentScene]

    const timeout = setTimeout(() => {
      const next = sceneIndex + 1
      if (next < SCENE_ORDER.length) {
        setSceneIndex(next)
        setScene(SCENE_ORDER[next])
      }
      // CTA stays visible — no reset to idle
    }, duration)

    return () => clearTimeout(timeout)
  }, [sceneIndex])

  const isFinished = scene === 'cta' && sceneIndex === SCENE_ORDER.length - 1
  const isPlaying = sceneIndex >= 0 && !isFinished

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: scene === 'doctor' ? colors.doctorBg : colors.bg,
        transition: 'background 0.4s ease',
      }}
    >
      <AnimatePresence mode="wait">
        {scene === 'idle' && <IdleScreen key="idle" onPlay={startAnimation} />}
        {scene === 'problem' && <ProblemScene key="problem" />}
        {scene === 'solution' && <SolutionScene key="solution" />}
        {scene === 'ai' && <AIScene key="ai" />}
        {scene === 'insights' && <InsightsScene key="insights" />}
        {scene === 'doctor' && <DoctorScene key="doctor" />}
        {scene === 'cta' && <CTAScene key="cta" />}
      </AnimatePresence>

      {/* Replay button */}
      {isFinished && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          onClick={() => {
            setScene('idle')
            setSceneIndex(-1)
          }}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-black/20"
          style={{ color: colors.fg }}
        >
          <RotateCcw className="size-3" />
          Nochmal
        </motion.button>
      )}

      {/* Progress bar */}
      {isPlaying && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: colors.border }}
        >
          <motion.div
            className="h-full"
            style={{ background: colors.primary }}
            initial={{ width: `${(sceneIndex / SCENE_ORDER.length) * 100}%` }}
            animate={{
              width: `${((sceneIndex + 1) / SCENE_ORDER.length) * 100}%`,
            }}
            transition={{
              duration: SCENE_DURATIONS[SCENE_ORDER[sceneIndex]] / 1000,
              ease: 'linear',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Idle / Play Button ──
function IdleScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-3"
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <motion.button
        onClick={onPlay}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="flex size-16 items-center justify-center rounded-full sm:size-20"
        style={{ background: colors.primary }}
      >
        <Play className="ml-1 size-7 text-white sm:size-8" />
      </motion.button>
      <p className="text-sm font-medium" style={{ color: colors.muted }}>
        Demo abspielen
      </p>
    </motion.div>
  )
}

// ── Scene 1: Problem ──
function ProblemScene() {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center"
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.25 } }}
    >
      {/* Flash */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: colors.primary }}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* "TAGEBUCH?" */}
      <motion.span
        className="text-center text-4xl font-black sm:text-6xl md:text-7xl"
        style={{ color: colors.fg }}
        initial={{ opacity: 0, scale: 3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        TAGEBUCH?
      </motion.span>

      {/* Red strike-through */}
      <motion.div
        className="absolute h-2 rounded-full sm:h-3"
        style={{ background: colors.destructive }}
        initial={{ width: 0 }}
        animate={{ width: '60%' }}
        transition={{ delay: 0.6, duration: 0.25, ease: 'easeOut' }}
      />

      {/* Subtitle */}
      <motion.span
        className="mt-4 text-lg font-semibold sm:mt-6 sm:text-2xl"
        style={{ color: colors.muted }}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.3, ease: 'easeOut' }}
      >
        Vergisst. Jeder.
      </motion.span>
    </motion.div>
  )
}

// ── Scene 2: Solution ──
function SolutionScene() {
  return (
    <motion.div
      className="flex h-full items-center justify-center gap-6 px-4 sm:gap-10"
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.25 } }}
    >
      {/* Phone with mic */}
      <motion.div
        className="relative flex h-44 w-24 flex-col items-center justify-center rounded-3xl border-2 sm:h-56 sm:w-28"
        style={{ background: colors.card, borderColor: colors.border }}
        initial={{ opacity: 0, scale: 0, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Notch */}
        <div
          className="absolute top-2 h-1 w-8 rounded-full"
          style={{ background: colors.muted, opacity: 0.4 }}
        />
        {/* Mic button */}
        <motion.div
          className="flex size-12 items-center justify-center rounded-full sm:size-14"
          style={{ background: colors.primary }}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 0.75, 1.15, 1] }}
          transition={{ delay: 0.5, duration: 0.35, times: [0, 0.2, 0.6, 1] }}
        >
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
            <rect x="4" y="0" width="12" height="18" rx="6" fill="white" />
            <path
              d="M2 14v2a8 8 0 0016 0v-2"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="24"
              x2="10"
              y2="28"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Pulse rings */}
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2"
            style={{ borderColor: colors.primary, width: 56, height: 56 }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.6, 0], scale: [1, 3 + i, 4 + i] }}
            transition={{ delay: 0.6 + delay, duration: 0.8, ease: 'easeOut' }}
          />
        ))}
      </motion.div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <motion.span
          className="text-3xl font-black sm:text-5xl md:text-6xl"
          style={{ color: colors.fg }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.5,
            duration: 0.3,
            type: 'spring',
            bounce: 0.4,
          }}
        >
          SPRICH.
        </motion.span>
        <motion.span
          className="text-lg font-semibold sm:text-xl"
          style={{ color: colors.primary }}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.3, ease: 'easeOut' }}
        >
          10 Sekunden. Fertig.
        </motion.span>
      </div>
    </motion.div>
  )
}

// ── Scene 3: AI Magic ──
function AIScene() {
  const cards = [
    { emoji: '💢', label: 'Rückenschmerzen', color: colors.destructive },
    { emoji: '📍', label: 'Links unten', color: colors.primary },
    {
      emoji: '🌙',
      label: 'Abends · Intensität 7/10',
      color: colors.doctorAccent,
    },
  ]

  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-3 px-4"
      exit={{ opacity: 0, scale: 1.3, transition: { duration: 0.25 } }}
    >
      {/* Voice bubble */}
      <motion.div
        className="rounded-full px-4 py-2 text-xs font-semibold text-white sm:px-5 sm:py-2.5 sm:text-sm"
        style={{ background: colors.primary }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 1, 0.3], scale: [0.5, 1, 1, 0.6] }}
        transition={{ duration: 1.5, times: [0, 0.2, 0.6, 1] }}
      >
        🎙 &ldquo;Rückenschmerzen links, abends&rdquo;
      </motion.div>

      {/* Sparks */}
      {[
        { x: -120, y: -30 },
        { x: 120, y: -40 },
        { x: 0, y: -60 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute size-2 rounded-full"
          style={{ background: i === 2 ? colors.primaryLight : colors.primary }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], x: pos.x, y: pos.y }}
          transition={{ delay: 1.2, duration: 0.4, ease: 'easeOut' }}
        />
      ))}

      {/* Extracted cards */}
      <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-sm">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2 rounded-xl border-l-4 bg-white px-3 py-2.5 text-sm font-bold shadow-sm sm:gap-3 sm:px-4 sm:py-3 sm:text-base"
            style={{ borderColor: card.color, color: colors.fg }}
            initial={{ opacity: 0, x: 200, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              delay: 1.5 + i * 0.15,
              duration: 0.3,
              type: 'spring',
              bounce: 0.35,
            }}
          >
            <span>{card.emoji}</span>
            <span>{card.label}</span>
          </motion.div>
        ))}
      </div>

      {/* "KI VERSTEHT." */}
      <motion.div className="mt-2 flex flex-col items-center">
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: colors.primary }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ delay: 2.8, duration: 0.3 }}
        />
        <motion.span
          className="text-2xl font-black sm:text-4xl"
          style={{ color: colors.fg }}
          initial={{ opacity: 0, scale: 2 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.8, duration: 0.25, ease: 'easeOut' }}
        >
          KI VERSTEHT.
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

// ── Scene 4: Insights ──
function InsightsScene() {
  const barHeights = [20, 35, 25, 50, 65, 40, 75, 58, 68, 85, 72, 95]

  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-4 px-4"
      exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.25 } }}
    >
      {/* "MUSTER." */}
      <motion.span
        className="text-3xl font-black sm:text-5xl"
        style={{ color: colors.fg }}
        initial={{ opacity: 0, scale: 2.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        MUSTER.
      </motion.span>

      {/* Bar chart */}
      <div className="flex items-end gap-1 sm:gap-1.5" style={{ height: 100 }}>
        {barHeights.map((h, i) => (
          <motion.div
            key={i}
            className="w-3 rounded-t sm:w-4"
            style={{
              background: colors.primary,
              opacity: 0.5 + (i / barHeights.length) * 0.5,
            }}
            initial={{ height: 0 }}
            animate={{ height: h }}
            transition={{
              delay: 0.4 + i * 0.05,
              duration: 0.3,
              type: 'spring',
              bounce: 0.3,
            }}
          />
        ))}
        {/* Trend arrow */}
        <motion.span
          className="ml-1 text-xl font-black sm:text-2xl"
          style={{ color: colors.destructive }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 1.4,
            duration: 0.3,
            type: 'spring',
            bounce: 0.5,
          }}
        >
          ↑
        </motion.span>
      </div>

      {/* Ranking cards */}
      <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-sm">
        <motion.div
          className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm font-bold shadow-sm sm:px-4 sm:py-2.5"
          style={{ borderColor: colors.primary, color: colors.fg }}
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.6, type: 'spring', bounce: 0.3 }}
        >
          <span>💢 Rückenschmerzen</span>
          <Counter target={12} delay={1.8} />
        </motion.div>
        <motion.div
          className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm font-bold shadow-sm sm:px-4 sm:py-2.5"
          style={{ borderColor: colors.border, color: colors.fg }}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.8, type: 'spring', bounce: 0.3 }}
        >
          <span>🤕 Kopfschmerzen</span>
          <Counter target={7} delay={2.0} />
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Scene 5: Doctor ──
function DoctorScene() {
  const miniBarHeights = [18, 30, 22, 40, 50, 38]

  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-4 px-4"
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.25 } }}
    >
      {/* Flash */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: colors.doctorAccent }}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Share link pill */}
      <motion.div
        className="rounded-full px-4 py-2 text-xs font-semibold text-white sm:text-sm"
        style={{ background: colors.primary, fontFamily: 'monospace' }}
        initial={{ opacity: 0, scale: 0, rotate: -5 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0, 1, 1, 0.3],
          y: [0, 0, 0, 40],
        }}
        transition={{
          duration: 1.2,
          times: [0, 0.25, 0.6, 1],
          ease: 'easeOut',
        }}
      >
        🔗 share.link/abc123
      </motion.div>

      {/* Dashboard mockup */}
      <motion.div
        className="w-full max-w-xs overflow-hidden rounded-xl border bg-white shadow-lg sm:max-w-sm"
        style={{ borderColor: colors.border }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', bounce: 0.3 }}
      >
        {/* Browser bar */}
        <div
          className="flex items-center gap-1.5 border-b px-3 py-2"
          style={{ borderColor: colors.border, background: '#ECEAE7' }}
        >
          <div
            className="size-2 rounded-full"
            style={{ background: colors.destructive }}
          />
          <div
            className="size-2 rounded-full"
            style={{ background: '#C49A3C' }}
          />
          <div
            className="size-2 rounded-full"
            style={{ background: colors.success }}
          />
          <div className="ml-3 h-3 w-24 rounded-full bg-white" />
        </div>
        <div className="space-y-2.5 p-3 sm:p-4">
          {/* AI Summary */}
          <p
            className="text-xs font-bold"
            style={{ color: colors.doctorPrimary }}
          >
            🤖 KI-Zusammenfassung
          </p>
          {[200, 170, 130].map((w, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              style={{
                background: i === 0 ? colors.doctorAccent : colors.border,
                opacity: i === 0 ? 0.5 : 0.3,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${w}px` }}
              transition={{
                delay: 1.2 + i * 0.1,
                duration: 0.25,
                ease: 'easeOut',
              }}
            />
          ))}
          {/* Mini chart */}
          <div className="flex items-end gap-1.5 pt-2" style={{ height: 50 }}>
            {miniBarHeights.map((h, i) => (
              <motion.div
                key={i}
                className="w-4 rounded-t sm:w-5"
                style={{
                  background: colors.doctorAccent,
                  opacity: 0.4 + (i / 6) * 0.6,
                }}
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{
                  delay: 1.6 + i * 0.06,
                  duration: 0.2,
                  type: 'spring',
                  bounce: 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Headlines */}
      <div className="flex flex-col items-center">
        <motion.span
          className="text-2xl font-black sm:text-4xl"
          style={{ color: colors.doctorPrimary }}
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.2, type: 'spring', bounce: 0.3 }}
        >
          SICHER TEILEN.
        </motion.span>
        <motion.span
          className="text-sm font-semibold sm:text-lg"
          style={{ color: colors.doctorAccent }}
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.4, type: 'spring', bounce: 0.3 }}
        >
          Du behältst die Kontrolle.
        </motion.span>
      </div>
    </motion.div>
  )
}

// ── Scene 6: CTA ──
function CTAScene() {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Flash */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: colors.primary }}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      />

      {/* Logo */}
      <motion.div
        className="flex size-16 items-center justify-center rounded-full sm:size-20"
        style={{ background: colors.primary }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: [0, 1.15, 1] }}
        transition={{ duration: 0.5, times: [0, 0.7, 1], ease: 'easeOut' }}
      >
        <svg width="24" height="36" viewBox="0 0 24 36" fill="none">
          <rect x="5" y="0" width="14" height="22" rx="7" fill="white" />
          <path
            d="M2 17v3a10 10 0 0020 0v-3"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="30"
            x2="12"
            y2="36"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          background: colors.primary,
          width: 120,
          height: 120,
          filter: 'blur(40px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.2, 0.1, 0.15] }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* "DEINE STIMME." */}
      <motion.span
        className="text-2xl font-black sm:text-4xl md:text-5xl"
        style={{ color: colors.fg }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', bounce: 0.35 }}
      >
        DEINE STIMME.
      </motion.span>

      {/* "DEINE GESUNDHEIT." */}
      <motion.span
        className="text-2xl font-black sm:text-4xl md:text-5xl"
        style={{ color: colors.primary }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', bounce: 0.35 }}
      >
        DEINE GESUNDHEIT.
      </motion.span>

      {/* App name */}
      <motion.span
        className="text-xs font-semibold tracking-widest sm:text-sm"
        style={{ color: colors.muted }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        SYMPTOMCHAT
      </motion.span>
    </motion.div>
  )
}

// ── Counter helper ──
function Counter({ target, delay }: { target: number; delay: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const startTime = delay * 1000
    const timer = setTimeout(() => {
      let step = 0
      const interval = setInterval(() => {
        step++
        setCount(Math.round((target * step) / 8))
        if (step >= 8) clearInterval(interval)
      }, 50)
    }, startTime)
    return () => clearTimeout(timer)
  }, [target, delay])

  return (
    <span style={{ color: colors.primary, minWidth: 30, textAlign: 'right' }}>
      {count}×
    </span>
  )
}
