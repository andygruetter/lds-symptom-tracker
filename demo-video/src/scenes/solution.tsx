import { makeScene2D, Txt, Rect, Circle, Line, Node } from '@motion-canvas/2d'
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
  easeInOutSine,
  linear,
} from '@motion-canvas/core'
import { colors, fonts, text, lang } from '../styles'

export default makeScene2D(function* (view) {
  const t = text[lang]
  view.fill(colors.bg)

  const phone = createRef<Rect>()
  const micButton = createRef<Circle>()
  const pulse1 = createRef<Circle>()
  const pulse2 = createRef<Circle>()
  const pulse3 = createRef<Circle>()
  const bigText = createRef<Txt>()
  const secondsText = createRef<Txt>()
  const container = createRef<Node>()
  const flash = createRef<Rect>()

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

  // Phone (minimal, just the outline with mic)
  container().add(
    <Rect
      ref={phone}
      width={200}
      height={380}
      radius={36}
      fill={colors.card}
      stroke={colors.border}
      lineWidth={3}
      x={-180}
      opacity={0}
      y={20}
      scale={0}
      rotation={-8}
    >
      <Rect
        width={60}
        height={6}
        radius={3}
        fill={colors.muted}
        y={-165}
        opacity={0.4}
      />
      <Circle
        ref={micButton}
        width={80}
        height={80}
        fill={colors.primary}
        y={40}
        scale={1}
      >
        <Rect width={18} height={30} radius={9} fill={colors.card} y={-4} />
        <Line
          points={[
            [-16, 8],
            [-16, 14],
            [16, 14],
            [16, 8],
          ]}
          stroke={colors.card}
          lineWidth={3}
          lineCap="round"
          lineJoin="round"
        />
        <Line
          points={[
            [0, 14],
            [0, 22],
          ]}
          stroke={colors.card}
          lineWidth={3}
          lineCap="round"
        />
      </Circle>
    </Rect>,
  )

  // Pulse rings (big, dramatic)
  for (const [ref, delay] of [
    [pulse1, 0],
    [pulse2, 0.15],
    [pulse3, 0.3],
  ] as const) {
    container().add(
      <Circle
        ref={ref === 0 ? pulse1 : ref === 0.15 ? pulse2 : pulse3}
        width={80}
        height={80}
        stroke={colors.primary}
        lineWidth={4}
        x={-180}
        y={60}
        opacity={0}
      />,
    )
  }
  // Re-add properly
  container().children().splice(1) // remove the bad ones
  container().add(
    <Circle
      ref={pulse1}
      width={80}
      height={80}
      stroke={colors.primary}
      lineWidth={4}
      x={-180}
      y={60}
      opacity={0}
    />,
  )
  container().add(
    <Circle
      ref={pulse2}
      width={80}
      height={80}
      stroke={colors.primary}
      lineWidth={3}
      x={-180}
      y={60}
      opacity={0}
    />,
  )
  container().add(
    <Circle
      ref={pulse3}
      width={80}
      height={80}
      stroke={colors.primary}
      lineWidth={2}
      x={-180}
      y={60}
      opacity={0}
    />,
  )

  // "SPRICH." / "SPEAK." — big kinetic text on the right
  container().add(
    <Txt
      ref={bigText}
      text={lang === 'de' ? 'SPRICH.' : 'SPEAK.'}
      fontFamily={fonts.sans}
      fontSize={110}
      fontWeight={900}
      fill={colors.fg}
      x={120}
      y={-30}
      opacity={0}
      scale={0.3}
    />,
  )

  // "10 Sekunden." counter
  container().add(
    <Txt
      ref={secondsText}
      text={lang === 'de' ? '10 Sekunden. Fertig.' : '10 seconds. Done.'}
      fontFamily={fonts.sans}
      fontSize={42}
      fontWeight={600}
      fill={colors.primary}
      x={120}
      y={60}
      opacity={0}
      x={180}
    />,
  )

  // === ANIMATION ===

  // 1. Phone SPINS in
  yield* all(
    phone().scale(1, 0.4, easeOutBack),
    phone().opacity(1, 0.15),
    phone().rotation(0, 0.5, easeOutCubic),
  )

  // 2. Mic tap — squeeze + flash
  yield* all(micButton().scale(0.7, 0.08, linear), flash().opacity(0.3, 0.05))
  yield* all(
    micButton().scale(1.15, 0.2, easeOutElastic),
    flash().opacity(0, 0.2),
  )
  yield* micButton().scale(1, 0.15, easeOutCubic)

  // 3. Pulse rings EXPLODE outward
  yield* all(
    // Ring 1
    pulse1().opacity(0.8, 0.05),
    pulse1().scale(4, 0.6, easeOutCubic),
    pulse1().opacity(0, 0.6),
    // Ring 2
    sequence(
      0.12,
      all(
        pulse2().opacity(0.6, 0.05),
        pulse2().scale(5, 0.7, easeOutCubic),
        pulse2().opacity(0, 0.7),
      ),
    ),
    // Ring 3
    sequence(
      0.24,
      all(
        pulse3().opacity(0.4, 0.05),
        pulse3().scale(6, 0.8, easeOutCubic),
        pulse3().opacity(0, 0.8),
      ),
    ),
    // "SPRICH." SLAMS in simultaneously
    sequence(
      0.1,
      all(bigText().opacity(1, 0.1), bigText().scale(1, 0.3, easeOutBack)),
    ),
  )

  yield* waitFor(0.2)

  // 4. "10 Sekunden. Fertig." slides in
  yield* all(
    secondsText().opacity(1, 0.15),
    secondsText().x(120, 0.3, easeOutBack),
  )

  yield* waitFor(0.8)

  // 5. Zoom out and fade
  yield* all(
    container().scale(0.7, 0.3, easeInBack),
    container().opacity(0, 0.25),
  )

  yield* waitFor(0.1)
})
