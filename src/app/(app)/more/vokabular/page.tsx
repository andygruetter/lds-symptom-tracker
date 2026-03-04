import { redirect } from 'next/navigation'

import { ArrowLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'

import { createServerClient } from '@/lib/db/client'
import { getVocabulary } from '@/lib/db/vocabulary'

const fieldLabels: Record<string, string> = {
  symptom_name: 'Symptom',
  body_region: 'Körperregion',
  side: 'Seite',
  symptom_type: 'Art',
  intensity: 'Intensität',
  medication_name: 'Medikament',
  action: 'Aktion',
  dosage: 'Dosis',
  reason: 'Grund',
}

export default async function VokabularPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const vocabulary = await getVocabulary(supabase, user.id)

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/more"
          className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          Mein Vokabular
        </h1>
      </div>

      {vocabulary.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpen className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Noch keine Begriffe gelernt. Das System lernt automatisch aus
            deinen Korrekturen.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Mein Begriff</th>
                <th className="px-4 py-2 font-medium">Bedeutung</th>
                <th className="px-4 py-2 text-right font-medium">#</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vocabulary.map((entry) => (
                <tr key={`${entry.patientTerm}-${entry.fieldName}`}>
                  <td className="px-4 py-3 font-medium">
                    {entry.patientTerm}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span>{entry.mappedTerm}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground/60">
                      {fieldLabels[entry.fieldName] ?? entry.fieldName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {entry.usageCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
