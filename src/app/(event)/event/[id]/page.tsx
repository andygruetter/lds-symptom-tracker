import { notFound, redirect } from 'next/navigation'

import { EventDetailView } from '@/components/event/event-detail-view'
import { createServerClient } from '@/lib/db/client'
import { getEventDetail } from '@/lib/db/insights'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  return <EventDetailView detail={detail} />
}
