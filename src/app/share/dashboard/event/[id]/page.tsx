import { redirect } from 'next/navigation'

import { DoctorEventDetailView } from '@/components/sharing/doctor-event-detail-view'
import { trackSharingAccessFromPage } from '@/lib/db/audit'
import { getSharedEventDetail } from '@/lib/db/sharing'
import { getSharingContext } from '@/lib/sharing/context'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params
  const context = await getSharingContext()

  const eventDetail = await getSharedEventDetail(
    context.accountId,
    id,
    context.dateFrom,
    context.dateTo,
  )

  if (!eventDetail) {
    redirect('/share/dashboard')
  }

  // Audit-Log: event_drill_down loggen (fire-and-forget, blockiert Zugriff nicht)
  void trackSharingAccessFromPage(
    { id: context.id, accountId: context.accountId },
    'event_drill_down',
    { eventId: id },
  )

  return <DoctorEventDetailView detail={eventDetail} />
}
