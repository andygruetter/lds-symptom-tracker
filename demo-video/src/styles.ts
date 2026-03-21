// Symptomchat brand colors (from app's Tailwind config)
export const colors = {
  bg: '#F2EDE7', // warm beige background
  fg: '#3D3530', // dark brown foreground
  primary: '#C4692E', // warm orange/amber
  primaryLight: '#E8A065', // lighter orange
  card: '#FFFFFF',
  border: '#D9D0C5',
  success: '#2D8B6F',
  warning: '#C49A3C',
  destructive: '#C43838',
  muted: '#A09890',
  doctorBg: '#F5F7FA', // cool blue-gray for doctor theme
  doctorPrimary: '#4A5E78', // dark blue for doctor
  doctorAccent: '#3B9B8F', // teal accent
}

// Shared text config
export const fonts = {
  sans: 'Inter, system-ui, sans-serif',
  mono: 'SF Mono, Consolas, monospace',
}

// DE and EN text variants
export const text = {
  de: {
    problem: 'Symptom-Tagebuch?\nVergisst jeder.',
    solution: 'Sprich einfach.\n10 Sekunden.',
    aiMagic: 'KI versteht.\nAuch Dialekt.',
    insights: 'Muster erkennen.\nTrends verstehen.',
    doctor: 'Sicher teilen.\nDu behältst die Kontrolle.',
    tagline: 'Deine Stimme.\nDeine Gesundheit.',
    appName: 'Symptomchat',
  },
  en: {
    problem: 'Symptom diary?\nEveryone forgets.',
    solution: 'Just speak.\n10 seconds.',
    aiMagic: 'AI understands.\nEven dialect.',
    insights: 'Spot patterns.\nUnderstand trends.',
    doctor: 'Share securely.\nYou stay in control.',
    tagline: 'Your voice.\nYour health.',
    appName: 'Symptomchat',
  },
}

// Choose language: change this to 'en' for English version
export const lang: 'de' | 'en' = 'de'
