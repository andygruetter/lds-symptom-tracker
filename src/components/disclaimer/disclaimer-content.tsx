import { DISCLAIMER_SECTIONS } from '@/lib/constants/disclaimer'

interface DisclaimerContentProps {
  headingLevel?: 'h2' | 'h3'
}

export function DisclaimerContent({
  headingLevel = 'h3',
}: DisclaimerContentProps) {
  const Heading = headingLevel

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {DISCLAIMER_SECTIONS.map((section) => (
        <section key={section.heading}>
          <Heading className="mb-1 font-medium text-foreground">
            {section.heading}
          </Heading>
          <p>{section.content}</p>
        </section>
      ))}
    </div>
  )
}
