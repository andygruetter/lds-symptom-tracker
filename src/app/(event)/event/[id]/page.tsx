import { notFound, redirect } from 'next/navigation'

import { EventDetailView } from '@/components/event/event-detail-view'
import { createServerClient } from '@/lib/db/client'
import { getEventDetail } from '@/lib/db/insights'

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const detail = await getEventDetail(supabase, id, user.id)

  if (!detail) {
    notFound()
  }

  const addPhoto = resolvedSearchParams.addPhoto === 'true'

  return <EventDetailView detail={detail} addPhoto={addPhoto} />
}
