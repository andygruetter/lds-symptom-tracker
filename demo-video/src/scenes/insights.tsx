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
  createSignal,
} from '@motion-canvas/core'
import { colors, fonts, text, lang } from '../styles'

export default makeScene2D(function* (view) {
  const t = text[lang]
  view.fill(colors.bg)

  const container = createRef<Node>()
  const headline = createRef<Txt>()
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

  // Chart bars — they'll SHOOT up
  const barHeights = [35, 60, 45, 80, 100, 70, 120, 95, 105, 140, 115, 155]
  const barCount = barHeights.length
  const bars: ReturnType<typeof createRef<Rect>>[] = []
  const totalWidth = (barCount - 1) * 38

  for (let i = 0; i < barCount; i++) {
    const ref = createRef<Rect>()
    bars.push(ref)
    container().add(
      <Rect
        ref={ref}
        width={30}
        height={0}
        radius={[8, 8, 0, 0]}
        fill={colors.primary}
        opacity={0.5 + (i / barCount) * 0.5}
        x={-totalWidth / 2 + i * 38}
        y={20}
      />,
    )
  }

  // Trend line overlay (connects bar tops)
  const trendLine = createRef<Line>()
  container().add(
    <Line
      ref={trendLine}
      points={barHeights.map((h, i) => [-totalWidth / 2 + i * 38, 20 - h])}
      stroke={colors.destructive}
      lineWidth={3}
      lineCap="round"
      lineJoin="round"
      end={0}
      opacity={0}
    />,
  )

  // Trend arrow (↑) at the end
  const trendArrow = createRef<Txt>()
  container().add(
    <Txt
      ref={trendArrow}
      text="↑"
      fontFamily={fonts.sans}
      fontSize={40}
      fontWeight={900}
      fill={colors.destructive}
      x={totalWidth / 2 + 30}
      y={20 - barHeights[barHeights.length - 1] - 20}
      opacity={0}
      scale={0}
    />,
  )

  // Ranking entries (bold, impactful)
  const rank1 = createRef<Rect>()
  const rank2 = createRef<Rect>()
  const count1 = createSignal('0')
  const count2 = createSignal('0')

  container().add(
    <Rect
      ref={rank1}
      width={360}
      height={50}
      radius={12}
      fill={colors.card}
      stroke={colors.primary}
      lineWidth={2}
      y={100}
      opacity={0}
      x={-400}
    >
      <Txt
        text={() =>
          lang === 'de'
            ? `💢  Rückenschmerzen  ${count1()}×`
            : `💢  Back pain  ${count1()}×`
        }
        fontFamily={fonts.sans}
        fontSize={20}
        fontWeight={800}
        fill={colors.fg}
      />
    </Rect>,
  )

  container().add(
    <Rect
      ref={rank2}
      width={360}
      height={50}
      radius={12}
      fill={colors.card}
      stroke={colors.border}
      lineWidth={2}
      y={160}
      opacity={0}
      x={400}
    >
      <Txt
        text={() =>
          lang === 'de'
            ? `🤕  Kopfschmerzen  ${count2()}×`
            : `🤕  Headaches  ${count2()}×`
        }
        fontFamily={fonts.sans}
        fontSize={20}
        fontWeight={700}
        fill={colors.fg}
      />
    </Rect>,
  )

  // "MUSTER ERKENNEN."
  container().add(
    <Txt
      ref={headline}
      text={lang === 'de' ? 'MUSTER.' : 'PATTERNS.'}
      fontFamily={fonts.sans}
      fontSize={80}
      fontWeight={900}
      fill={colors.fg}
      y={-160}
      opacity={0}
      scale={2.5}
    />,
  )

  // === ANIMATION ===

  // 1. Title SLAMS in
  yield* all(
    flash().opacity(0.3, 0.05),
    headline().opacity(1, 0.08),
    headline().scale(1, 0.25, easeOutCubic),
  )
  yield* flash().opacity(0, 0.15)

  yield* waitFor(0.15)

  // 2. Bars SHOOT up in rapid succession
  yield* sequence(
    0.04,
    ...bars.map((bar, i) =>
      all(
        bar().height(barHeights[i], 0.25, easeOutBack),
        bar().y(20 - barHeights[i] / 2, 0.25, easeOutBack),
      ),
    ),
  )

  // 3. Trend line draws across with the red arrow
  yield* all(
    trendLine().opacity(0.8, 0.1),
    trendLine().end(1, 0.5, easeOutCubic),
  )
  yield* all(
    trendArrow().opacity(1, 0.1),
    trendArrow().scale(1, 0.3, easeOutElastic),
  )

  yield* waitFor(0.1)

  // 4. Ranking cards SLIDE in from opposite sides
  yield* all(
    rank1().opacity(1, 0.1),
    rank1().x(0, 0.3, easeOutBack),
    rank2().opacity(1, 0.1),
    rank2().x(0, 0.35, easeOutBack),
  )

  // 5. Numbers COUNT UP
  const steps = 8
  for (let s = 1; s <= steps; s++) {
    const v1 = Math.round((12 * s) / steps)
    const v2 = Math.round((7 * s) / steps)
    count1(v1.toString())
    count2(v2.toString())
    yield* waitFor(0.04)
  }

  yield* waitFor(0.6)

  // 6. Exit — zoom through
  yield* all(
    container().scale(1.3, 0.3, easeInBack),
    container().opacity(0, 0.25),
  )

  yield* waitFor(0.1)
})
