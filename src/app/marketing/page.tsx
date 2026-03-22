import Link from 'next/link'

import {
  Activity,
  BadgeCheck,
  Clock,
  Globe,
  HeartPulse,
  Lock,
  Mic,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { Metadata } from 'next'

import { DemoAnimation } from '@/components/marketing/demo-animation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Symptomchat — Symptome erfassen, Muster erkennen',
  description:
    'Erfasse Symptome in unter 10 Sekunden per Sprache oder Text. KI extrahiert automatisch strukturierte medizinische Daten. Teile deine Symptomgeschichte mit deinem Arzt.',
  openGraph: {
    title: 'Symptomchat — Symptome erfassen, Muster erkennen',
    description:
      'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen. Sprache → Struktur in 10 Sekunden.',
    url: '/marketing',
    type: 'website',
    locale: 'de_CH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Symptomchat — Symptome erfassen, Muster erkennen',
    description:
      'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen. Sprache → Struktur in 10 Sekunden.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Symptomchat',
  description:
    'Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen Erkrankungen',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CHF',
    description: 'Kostenlose Symptomerfassung',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Ist Symptomchat kostenlos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja. Die Symptomerfassung und -analyse ist kostenlos. Kein Abo, keine Kreditkarte nötig.',
      },
    },
    {
      '@type': 'Question',
      name: 'Wie funktioniert die Spracheingabe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Du sprichst einfach frei — auch Schweizerdeutsch. Die KI erkennt automatisch Symptome, Intensität und Körperregionen und erstellt strukturierte medizinische Daten.',
      },
    },
    {
      '@type': 'Question',
      name: 'Sind meine Gesundheitsdaten sicher?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja. Deine Daten werden verschlüsselt gespeichert und können keiner Person zugeordnet werden. Du bestimmst, wer Zugriff hat, und kannst ihn jederzeit widerrufen.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kann ich meine Symptome mit meinem Arzt teilen?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ja. Du kannst einen zeitlich begrenzten Freigabe-Link erstellen, über den dein Arzt deine Symptomgeschichte einsehen kann.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ersetzt Symptomchat eine ärztliche Diagnose?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nein. Symptomchat ist kein Medizinprodukt. Die App unterstützt dich bei der Dokumentation deiner Symptome, ersetzt aber keine ärztliche Beratung oder Diagnose.',
      },
    },
  ],
}

const faqs = faqJsonLd.mainEntity.map((item) => ({
  question: item.name,
  answer: item.acceptedAnswer.text,
}))

const features = [
  {
    icon: Mic,
    title: 'Sprache → Struktur',
    description:
      'Sprich frei — auch Schweizerdeutsch. Die KI erzeugt automatisch strukturierte medizinische Daten.',
  },
  {
    icon: Clock,
    title: 'Unter 10 Sekunden',
    description:
      'Symptom aufnehmen, fertig. Kein Formular, kein Tagebuch. Die App macht den Rest.',
  },
  {
    icon: Sparkles,
    title: 'Anti-Tagebuch',
    description:
      'Ereignisbasiert statt pflichtbasiert. Keine Eingabe = guter Tag. Kein Schuldgefühl, keine Streaks.',
  },
  {
    icon: Activity,
    title: 'Muster entdecken',
    description:
      'Nach Wochen und Monaten zeigt die App Trends und Muster, die dir vorher nicht bewusst waren.',
  },
  {
    icon: Share2,
    title: 'Sicheres Teilen',
    description:
      'Teile deine Symptomgeschichte per zeitlich begrenztem Link — du entscheidest, mit wem und wie lange.',
  },
  {
    icon: ShieldCheck,
    title: 'Volle Kontrolle über deine Daten',
    description:
      'Symptomchat kann deine Daten keiner Person zuordnen. Du bestimmst, wer Zugriff hat, und kannst ihn jederzeit widerrufen.',
  },
]

export default function MarketingPage() {
  return (
    <div data-theme="patient" className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero Section */}
      <section className="px-6 pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Symptome erfassen.
            <br />
            <span className="text-primary">Muster erkennen.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Ereignisbasiertes Symptom-Tracking für Patienten mit seltenen
            Erkrankungen. Sprich oder tippe — die KI erledigt den Rest.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="text-base">
              <Link href="/auth/login">Jetzt kostenlos starten</Link>
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Globe className="size-4" />
              <span>Entwickelt in der Schweiz</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="size-4" />
              <span>Datenschutz-konform</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              <span>100% kostenlos</span>
            </div>
            <div className="flex items-center gap-2">
              <HeartPulse className="size-4" />
              <span>Für seltene Erkrankungen</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            So einfach wie eine Sprachnachricht
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Kein Formular, kein Tagebuch, kein Aufwand. Du sprichst, die App
            versteht.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border/60">
                <CardContent className="pt-6">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section id="demo" className="scroll-mt-8 px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Sieh es in Aktion
          </h2>
          <p className="mt-4 text-muted-foreground">
            Von der Sprachaufnahme bis zum Arzt-Dashboard — in unter einer
            Minute.
          </p>

          <div className="mx-auto mt-8 aspect-video max-w-2xl overflow-hidden rounded-xl border border-border shadow-lg">
            <DemoAnimation />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-card px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Entwickelt mit Patienten, für Patienten
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Symptomchat entstand aus der Frustration über komplizierte
            Symptom-Tagebücher und der Erkenntnis, dass es einfacher gehen muss.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                &lt;10s
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Durchschnittliche Erfassungszeit pro Symptom
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                100%
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Kostenlos — keine versteckten Kosten
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary sm:text-4xl">
                3 Sprachen
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Deutsch, Schweizerdeutsch und Englisch
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Card className="border-border/60">
              <CardContent className="pt-6">
                <p className="text-sm italic text-muted-foreground">
                  &laquo;Endlich muss ich nicht mehr jeden Abend ein Tagebuch
                  ausfüllen. Ich spreche kurz rein, wenn etwas ist —
                  fertig.&raquo;
                </p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  — Patientin mit LDS, Bern
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-6">
                <p className="text-sm italic text-muted-foreground">
                  &laquo;Die strukturierten Daten helfen mir, meinem Arzt viel
                  präziser zu berichten. Er war beeindruckt.&raquo;
                </p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  — Patient mit EDS, Bern
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Häufig gestellte Fragen
          </h2>
          <div className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="border-b border-border pb-6">
                <h3 className="font-semibold text-foreground">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-card px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Bereit, deine Symptome zu tracken?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Kostenlos starten. Keine Kreditkarte, kein Abo nötig.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-base">
              <Link href="/auth/login">Jetzt kostenlos starten</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link href="#demo">Demo ansehen</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Disclaimer + Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs text-muted-foreground">
            <strong>Hinweis:</strong> Symptomchat ist kein Medizinprodukt und
            ersetzt keine ärztliche Diagnose oder Behandlung. Die App dient
            ausschliesslich der persönlichen Dokumentation von Symptomen.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Symptomchat
          </p>
        </div>
      </footer>
    </div>
  )
}
