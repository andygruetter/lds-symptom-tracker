import { notFound, redirect } from 'next/navigation'

import { EventEditForm } from '@/components/event/event-edit-form'
import { sortByFieldOrder } from '@/lib/field-config'
import { createServerClient } from '@/lib/db/client'
import type { Database } from '@/types/database'

type Correction = Database['public']['Tables']['corrections']['Row']

export default async function EventEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerClient()

  // Auth-Check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Event laden + Ownership prüfen
  const { data: event, error: eventError } = await supabase
    .from('symptom_events')
    .select('*')
    .eq('id', id)
    .eq('account_id', user.id)
    .is('deleted_at', null)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // Medikamenten-Events sind in dieser Iteration nicht unterstützt
  if (event.event_type === 'medication') {
    notFound()
  }

  // extracted_data laden
  const { data: extractedFields } = await supabase
    .from('extracted_data')
    .select('*')
    .eq('symptom_event_id', id)

  // Corrections-Historie laden
  const { data: corrections } = await supabase
    .from('corrections')
    .select('*')
    .eq('symptom_event_id', id)
    .order('created_at', { ascending: false })

  const allFieldNames = sortByFieldOrder([
    ...new Set((extractedFields ?? []).map((f) => f.field_name)),
  ])

  return (
    <EventEditForm
      event={event}
      extractedFields={extractedFields ?? []}
      corrections={(corrections ?? []) as Correction[]}
      allFieldNames={allFieldNames}
    />
  )
}
