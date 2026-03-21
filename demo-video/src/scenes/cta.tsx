import { makeScene2D, Txt, Rect, Circle, Node } from '@motion-canvas/2d'
import {
  createRef,
  all,
  waitFor,
  sequence,
  easeInOutCubic,
  easeOutCubic,
  easeOutBack,
  easeOutElastic,
  linear,
} from '@motion-canvas/core'
import { colors, fonts, text, lang } from '../styles'

export default makeScene2D(function* (view) {
  const t = text[lang]
  view.fill(colors.bg)

  const container = createRef<Node>()
  const flash = createRef<Rect>()
  const logo = createRef<Circle>()
  const glow = createRef<Circle>()
  const line1 = createRef<Txt>()
  const line2 = createRef<Txt>()
  const appName = createRef<Txt>()

  view.add(
    <Rect
      ref={flash}
      width={1920}
      height={1080}
      fill={colors.primary}
      opacity={0}
    />,
  )
  view.add(<Node ref={container} />)

  // Glow behind logo
  container().add(
    <Circle
      ref={glow}
      width={200}
      height={200}
      fill={colors.primary}
      opacity={0}
      y={-80}
    />,
  )

  // Logo circle
  container().add(
    <Circle
      ref={logo}
      width={120}
      height={120}
      fill={colors.primary}
      y={-80}
      opacity={0}
      scale={0}
    >
      <Rect width={20} height={36} radius={10} fill={colors.card} y={-5} />
      <Rect width={6} height={16} radius={3} fill={colors.card} y={18} />
    </Circle>,
  )

  // "DEINE STIMME." — line 1
  container().add(
    <Txt
      ref={line1}
      text={lang === 'de' ? 'DEINE STIMME.' : 'YOUR VOICE.'}
      fontFamily={fonts.sans}
      fontSize={72}
      fontWeight={900}
      fill={colors.fg}
      y={20}
      opacity={0}
      scale={0.5}
    />,
  )

  // "DEINE GESUNDHEIT." — line 2
  container().add(
    <Txt
      ref={line2}
      text={lang === 'de' ? 'DEINE GESUNDHEIT.' : 'YOUR HEALTH.'}
      fontFamily={fonts.sans}
      fontSize={72}
      fontWeight={900}
      fill={colors.primary}
      y={95}
      opacity={0}
      scale={0.5}
    />,
  )

  // App name
  container().add(
    <Txt
      ref={appName}
      text="LDS Symptom Tracker"
      fontFamily={fonts.sans}
      fontSize={22}
      fontWeight={600}
      fill={colors.muted}
      y={170}
      opacity={0}
      letterSpacing={4}
    />,
  )

  // === ANIMATION ===

  // 1. BIG flash transition
  yield* flash().opacity(0.7, 0.06)
  yield* flash().opacity(0, 0.3, easeOutCubic)

  // 2. Logo BURSTS in
  yield* all(
    logo().opacity(1, 0.08),
    logo().scale(1, 0.4, easeOutElastic),
    glow().opacity(0.15, 0.3),
    glow().scale(1.5, 0.5, easeOutCubic),
  )

  yield* waitFor(0.1)

  // 3. Line 1 ZOOMS in
  yield* all(line1().opacity(1, 0.08), line1().scale(1, 0.25, easeOutBack))

  yield* waitFor(0.08)

  // 4. Line 2 ZOOMS in (slightly delayed, in brand color)
  yield* all(line2().opacity(1, 0.08), line2().scale(1, 0.25, easeOutBack))

  yield* waitFor(0.1)

  // 5. App name fades in
  yield* appName().opacity(1, 0.3, easeInOutCubic)

  // 6. Subtle pulse on logo
  yield* all(
    logo().scale(1.08, 0.4, easeInOutCubic),
    glow().scale(1.8, 0.4, easeInOutCubic),
    glow().opacity(0.08, 0.4),
  )
  yield* all(
    logo().scale(1, 0.4, easeInOutCubic),
    glow().scale(1.5, 0.4, easeInOutCubic),
    glow().opacity(0.12, 0.4),
  )

  // 7. Hold for final impact
  yield* waitFor(0.5)
})
