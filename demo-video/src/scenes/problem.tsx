import { makeScene2D, Txt, Rect, Line, Circle, Node } from '@motion-canvas/2d'
import {
  createRef,
  all,
  waitFor,
  sequence,
  easeInOutCubic,
  easeOutCubic,
  easeOutBack,
  easeInBack,
  easeOutElastic,
  linear,
  Vector2,
} from '@motion-canvas/core'
import { colors, fonts, text, lang } from '../styles'

export default makeScene2D(function* (view) {
  const t = text[lang]
  view.fill(colors.bg)

  const container = createRef<Node>()
  const word1 = createRef<Txt>()
  const word2 = createRef<Txt>()
  const strikeRect = createRef<Rect>()
  const flash = createRef<Rect>()

  // Full-screen flash for impact
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

  // Big bold word: "TAGEBUCH?" / "DIARY?"
  container().add(
    <Txt
      ref={word1}
      text={lang === 'de' ? 'TAGEBUCH?' : 'DIARY?'}
      fontFamily={fonts.sans}
      fontSize={120}
      fontWeight={900}
      fill={colors.fg}
      y={-30}
      opacity={0}
      scale={3}
    />,
  )

  // Strike-through rectangle (red bar)
  container().add(
    <Rect
      ref={strikeRect}
      width={0}
      height={16}
      radius={8}
      fill={colors.destructive}
      y={-30}
      x={-350}
    />,
  )

  // Second line
  container().add(
    <Txt
      ref={word2}
      text={lang === 'de' ? 'Vergisst. Jeder.' : 'Everyone. Forgets.'}
      fontFamily={fonts.sans}
      fontSize={56}
      fontWeight={700}
      fill={colors.muted}
      y={60}
      opacity={0}
      x={80}
    />,
  )

  // === ANIMATION ===

  // 1. SLAM — word zooms in from huge with a flash
  yield* all(
    flash().opacity(0.6, 0.05),
    word1().opacity(1, 0.05),
    word1().scale(1, 0.35, easeOutCubic),
  )
  yield* flash().opacity(0, 0.15, easeOutCubic)

  yield* waitFor(0.3)

  // 2. Red strike-through SLASHES across
  yield* strikeRect().width(700, 0.25, easeOutCubic)

  // 3. Tiny screen shake
  yield* container().position.x(12, 0.04, linear)
  yield* container().position.x(-8, 0.04, linear)
  yield* container().position.x(4, 0.03, linear)
  yield* container().position.x(0, 0.03, linear)

  yield* waitFor(0.15)

  // 4. "Vergisst. Jeder." slides in from right
  yield* all(word2().opacity(1, 0.2), word2().x(0, 0.35, easeOutBack))

  yield* waitFor(0.6)

  // 5. Everything scales down and fades
  yield* all(
    container().scale(0.8, 0.3, easeInBack),
    container().opacity(0, 0.25, easeInOutCubic),
  )

  yield* waitFor(0.1)
})
