import { AppleSignInButton } from '@/components/auth/apple-sign-in-button'

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  const error = searchParams.error

  return (
    <div
      data-theme="patient"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            LDS Symptom Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Symptom-Tracking für Patienten mit seltenen Erkrankungen
          </p>
        </div>

        <AppleSignInButton />

        {error === 'callback' && (
          <p className="text-center text-sm text-destructive">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
      </div>
    </div>
  )
}
