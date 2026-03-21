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
  const voiceBlob = createRef<Rect>()
  const card1 = createRef<Rect>()
  const card2 = createRef<Rect>()
  const card3 = createRef<Rect>()
  const headline = createRef<Txt>()
  const sparkL = createRef<Circle>()
  const sparkR = createRef<Circle>()
  const sparkT = createRef<Circle>()
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

  // Voice bubble (chat-style, what the patient said)
  container().add(
    <Rect
      ref={voiceBlob}
      width={420}
      height={70}
      radius={35}
      fill={colors.primary}
      y={-180}
      opacity={0}
      scale={0.5}
    >
      <Txt
        text={
          lang === 'de'
            ? '🎙 \u201ERückenschmerzen links, abends\u201C'
            : '🎙 \u201CBack pain left side, evenings\u201D'
        }
        fontFamily={fonts.sans}
        fontSize={20}
        fontWeight={600}
        fill={colors.card}
      />
    </Rect>,
  )

  // Sparks / particles around transformation
  container().add(
    <Circle
      ref={sparkL}
      width={8}
      height={8}
      fill={colors.primary}
      x={-200}
      y={-60}
      opacity={0}
    />,
  )
  container().add(
    <Circle
      ref={sparkR}
      width={6}
      height={6}
      fill={colors.primaryLight}
      x={200}
      y={-80}
      opacity={0}
    />,
  )
  container().add(
    <Circle
      ref={sparkT}
      width={10}
      height={10}
      fill={colors.warning}
      x={0}
      y={-120}
      opacity={0}
    />,
  )

  // Extracted data cards — bigger, bolder
  const cardData = [
    {
      emoji: '💢',
      label: lang === 'de' ? 'Rückenschmerzen' : 'Back pain',
      ref: card1,
      y: -50,
      color: colors.destructive,
    },
    {
      emoji: '📍',
      label: lang === 'de' ? 'Links unten' : 'Lower left',
      ref: card2,
      y: 20,
      color: colors.primary,
    },
    {
      emoji: '🌙',
      label:
        lang === 'de'
          ? 'Abends · Intensität 7/10'
          : 'Evenings · Intensity 7/10',
      ref: card3,
      y: 90,
      color: colors.doctorAccent,
    },
  ]

  for (const card of cardData) {
    container().add(
      <Rect
        ref={card.ref}
        width={380}
        height={58}
        radius={16}
        fill={colors.card}
        stroke={card.color}
        lineWidth={2.5}
        y={card.y}
        opacity={0}
        x={300}
        scale={0.9}
      >
        <Rect width={6} height={36} radius={3} fill={card.color} x={-178} />
        <Txt
          text={`${card.emoji}  ${card.label}`}
          fontFamily={fonts.sans}
          fontSize={22}
          fontWeight={700}
          fill={colors.fg}
          x={10}
        />
      </Rect>,
    )
  }

  // "KI VERSTEHT." headline
  container().add(
    <Txt
      ref={headline}
      text={lang === 'de' ? 'KI VERSTEHT.' : 'AI UNDERSTANDS.'}
      fontFamily={fonts.sans}
      fontSize={72}
      fontWeight={900}
      fill={colors.fg}
      y={200}
      opacity={0}
      scale={2}
    />,
  )

  // === ANIMATION ===

  // 1. Voice bubble pops in
  yield* all(
    voiceBlob().opacity(1, 0.1),
    voiceBlob().scale(1, 0.3, easeOutBack),
  )

  yield* waitFor(0.3)

  // 2. Flash + voice bubble shrinks = "processing"
  yield* all(
    flash().opacity(0.4, 0.06),
    voiceBlob().scale(0.6, 0.15, easeInBack),
    voiceBlob().opacity(0.3, 0.15),
  )
  yield* flash().opacity(0, 0.15)

  // 3. Sparks fly out
  yield* all(
    sparkL().opacity(1, 0.05),
    sparkL().x(-280, 0.4, easeOutCubic),
    sparkL().y(-120, 0.4, easeOutCubic),
    sparkL().opacity(0, 0.4),
    sparkR().opacity(1, 0.05),
    sparkR().x(280, 0.4, easeOutCubic),
    sparkR().y(-140, 0.4, easeOutCubic),
    sparkR().opacity(0, 0.4),
    sparkT().opacity(1, 0.05),
    sparkT().y(-200, 0.4, easeOutCubic),
    sparkT().opacity(0, 0.4),
  )

  // 4. Cards SLAM in from right, staggered
  yield* sequence(
    0.1,
    all(
      card1().x(0, 0.3, easeOutBack),
      card1().opacity(1, 0.1),
      card1().scale(1, 0.3, easeOutBack),
    ),
    all(
      card2().x(0, 0.3, easeOutBack),
      card2().opacity(1, 0.1),
      card2().scale(1, 0.3, easeOutBack),
    ),
    all(
      card3().x(0, 0.3, easeOutBack),
      card3().opacity(1, 0.1),
      card3().scale(1, 0.3, easeOutBack),
    ),
  )

  yield* waitFor(0.15)

  // 5. "KI VERSTEHT." zooms in with flash
  yield* all(
    flash().opacity(0.3, 0.05),
    headline().opacity(1, 0.08),
    headline().scale(1, 0.3, easeOutCubic),
  )
  yield* flash().opacity(0, 0.2)

  yield* waitFor(0.8)

  // 6. Exit — cards fly off left, text scales up
  yield* all(
    card1().x(-500, 0.25, easeInBack),
    card2().x(-500, 0.3, easeInBack),
    card3().x(-500, 0.35, easeInBack),
    voiceBlob().opacity(0, 0.2),
    headline().scale(1.5, 0.3, easeInBack),
    headline().opacity(0, 0.25),
  )

  yield* waitFor(0.1)
})
