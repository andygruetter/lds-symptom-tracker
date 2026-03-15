'use server'

import { revalidatePath } from 'next/cache'

import { createServerClient } from '@/lib/db/client'
import {
  createSharingLink,
  getAllSharingLinks,
  getActiveSharingLinks,
  revokeSharingLink,
  updateSharingLinkEmail,
} from '@/lib/db/sharing'
import type { ActionResult } from '@/types/common'
import {
  CreateSharingLinkSchema,
  RevokeSharingLinkSchema,
  emailSchema,
  type CreateSharingLinkInput,
  type SharingLink,
  type SharingLinkListItem,
} from '@/types/sharing'

export async function createSharingLinkAction(
  input: CreateSharingLinkInput,
): Promise<ActionResult<SharingLink>> {
  const parsed = CreateSharingLinkSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Eingabedaten', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const recipientEmail =
    parsed.data.recipientEmail && parsed.data.recipientEmail !== ''
      ? parsed.data.recipientEmail
      : undefined

  const result = await createSharingLink(supabase, user.id, {
    ...parsed.data,
    recipientEmail,
  })

  if (result.error) {
    return { data: null, error: result.error }
  }

  revalidatePath('/more')

  return { data: result.data, error: null }
}

export async function updateSharingLinkEmailAction(
  linkId: string,
  recipientEmail: string,
): Promise<ActionResult<null>> {
  const parsed = emailSchema.safeParse(recipientEmail)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiges E-Mail-Format', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  return await updateSharingLinkEmail(supabase, user.id, linkId, recipientEmail)
}

export async function loadActiveSharingLinks(): Promise<
  ActionResult<SharingLinkListItem[]>
> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  return await getActiveSharingLinks(supabase, user.id)
}

export async function loadAllSharingLinks(): Promise<
  ActionResult<SharingLinkListItem[]>
> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  return await getAllSharingLinks(supabase, user.id)
}

export async function revokeSharingLinkAction(
  linkId: string,
): Promise<ActionResult<null>> {
  const parsed = RevokeSharingLinkSchema.safeParse({ linkId })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Link-ID', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const result = await revokeSharingLink(supabase, user.id, linkId)
  if (result.error) return result

  revalidatePath('/more')
  return { data: null, error: null }
}
