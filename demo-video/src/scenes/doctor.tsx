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
  linear,
} from '@motion-canvas/core'
import { colors, fonts, text, lang } from '../styles'

export default makeScene2D(function* (view) {
  const t = text[lang]
  view.fill(colors.doctorBg)

  const container = createRef<Node>()
  const flash = createRef<Rect>()
  const linkPill = createRef<Rect>()
  const dashboard = createRef<Rect>()
  const summaryLines = [createRef<Rect>(), createRef<Rect>(), createRef<Rect>()]
  const miniBars: ReturnType<typeof createRef<Rect>>[] = []
  const headline = createRef<Txt>()
  const subline = createRef<Txt>()

  view.add(
    <Rect
      ref={flash}
      width={1920}
      height={1080}
      fill={colors.doctorAccent}
      opacity={0}
    />,
  )
  view.add(<Node ref={container} />)

  // Share link pill
  container().add(
    <Rect
      ref={linkPill}
      width={300}
      height={48}
      radius={24}
      fill={colors.primary}
      y={-200}
      opacity={0}
      scale={0}
      rotation={-5}
    >
      <Txt
        text="🔗  share.link/abc123"
        fontFamily={fonts.mono}
        fontSize={17}
        fontWeight={600}
        fill={colors.card}
      />
    </Rect>,
  )

  // Dashboard mockup (clean, minimal)
  container().add(
    <Rect
      ref={dashboard}
      width={420}
      height={280}
      radius={16}
      fill={colors.card}
      stroke={colors.border}
      lineWidth={2}
      y={20}
      opacity={0}
      scale={0.6}
    >
      {/* Browser dots */}
      <Circle
        width={8}
        height={8}
        fill={colors.destructive}
        x={-185}
        y={-120}
      />
      <Circle width={8} height={8} fill={colors.warning} x={-170} y={-120} />
      <Circle width={8} height={8} fill={colors.success} x={-155} y={-120} />

      {/* AI Summary section */}
      <Rect width={380} height={4} radius={2} fill={colors.border} y={-100} />
      <Txt
        text={lang === 'de' ? '🤖 KI-Zusammenfassung' : '🤖 AI Summary'}
        fontFamily={fonts.sans}
        fontSize={14}
        fontWeight={800}
        fill={colors.doctorPrimary}
        x={-95}
        y={-80}
      />
    </Rect>,
  )

  // Summary "text lines" that appear
  const lineY = [-55, -35, -15]
  const lineWidths = [300, 260, 200]
  for (let i = 0; i < 3; i++) {
    const ref = summaryLines[i]
    dashboard().add(
      <Rect
        ref={ref}
        width={0}
        height={8}
        radius={4}
        fill={i === 0 ? colors.doctorAccent : colors.border}
        opacity={i === 0 ? 0.6 : 0.3}
        y={lineY[i]}
        x={-50}
      />,
    )
  }

  // Mini bar chart inside dashboard
  const miniBarHeights = [25, 40, 30, 55, 65, 50]
  for (let i = 0; i < miniBarHeights.length; i++) {
    const ref = createRef<Rect>()
    miniBars.push(ref)
    dashboard().add(
      <Rect
        ref={ref}
        width={22}
        height={0}
        radius={[4, 4, 0, 0]}
        fill={colors.doctorAccent}
        opacity={0.4 + (i / 6) * 0.6}
        x={-80 + i * 32}
        y={80}
      />,
    )
  }

  // "SICHER TEILEN." headline
  container().add(
    <Txt
      ref={headline}
      text={lang === 'de' ? 'SICHER TEILEN.' : 'SHARE SECURELY.'}
      fontFamily={fonts.sans}
      fontSize={72}
      fontWeight={900}
      fill={colors.doctorPrimary}
      y={220}
      opacity={0}
      x={-300}
    />,
  )

  container().add(
    <Txt
      ref={subline}
      text={
        lang === 'de' ? 'Du behältst die Kontrolle.' : 'You stay in control.'
      }
      fontFamily={fonts.sans}
      fontSize={34}
      fontWeight={700}
      fill={colors.doctorAccent}
      y={275}
      opacity={0}
      x={300}
    />,
  )

  // === ANIMATION ===

  // 1. Color flash for scene transition
  yield* flash().opacity(0.5, 0.06)
  yield* flash().opacity(0, 0.2)

  // 2. Link pill POPS in with spin
  yield* all(
    linkPill().opacity(1, 0.1),
    linkPill().scale(1, 0.3, easeOutBack),
    linkPill().rotation(0, 0.4, easeOutCubic),
  )

  yield* waitFor(0.15)

  // 3. Link flies down into dashboard which scales up
  yield* all(
    linkPill().y(-120, 0.25, easeInBack),
    linkPill().scale(0.3, 0.25, easeInBack),
    linkPill().opacity(0, 0.2),
    dashboard().opacity(1, 0.15),
    dashboard().scale(1, 0.35, easeOutBack),
  )

  // 4. Summary lines TYPE across
  yield* sequence(
    0.08,
    ...summaryLines.map((ref, i) =>
      ref().width(lineWidths[i], 0.25, easeOutCubic),
    ),
  )

  // 5. Mini bars shoot up
  yield* sequence(
    0.05,
    ...miniBars.map((bar, i) =>
      all(
        bar().height(miniBarHeights[i], 0.2, easeOutBack),
        bar().y(80 - miniBarHeights[i] / 2, 0.2, easeOutBack),
      ),
    ),
  )

  // 6. Headlines SLAM in from opposite sides
  yield* all(
    headline().opacity(1, 0.1),
    headline().x(0, 0.3, easeOutBack),
    subline().opacity(1, 0.1),
    subline().x(0, 0.35, easeOutBack),
  )

  yield* waitFor(0.8)

  // 7. Exit
  yield* all(
    container().scale(0.8, 0.3, easeInBack),
    container().opacity(0, 0.25),
  )

  yield* waitFor(0.1)
})
