'use client'

import { useState } from 'react'

import { BookOpen, ChevronRight, FileText, LogOut, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { DeleteAccountDialog } from '@/components/account/delete-account-dialog'
import { signOut } from '@/lib/actions/auth-actions'
import { DisclaimerContent } from '@/components/disclaimer/disclaimer-content'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DISCLAIMER_TITLE } from '@/lib/constants/disclaimer'

export default function MorePage() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Mehr</h1>

      {/* Rechtliches */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Rechtliches
        </h2>
        <div className="divide-y divide-border rounded-xl bg-card">
          <button
            onClick={() => setDisclaimerOpen(true)}
            className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              <FileText className="size-5 text-muted-foreground" />
              <span className="text-sm">Disclaimer anzeigen</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* KI & Lernen */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          KI & Lernen
        </h2>
        <div className="divide-y divide-border rounded-xl bg-card">
          <Link
            href="/more/vokabular"
            className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="size-5 text-muted-foreground" />
              <span className="text-sm">Mein Vokabular</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Account
        </h2>
        <div className="divide-y divide-border rounded-xl bg-card">
          <button
            onClick={() => signOut()}
            className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              <LogOut className="size-5 text-muted-foreground" />
              <span className="text-sm">Abmelden</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="size-5 text-destructive" />
              <span className="text-sm text-destructive">Account löschen</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* Disclaimer Dialog */}
      <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{DISCLAIMER_TITLE}</DialogTitle>
            <DialogDescription>
              Rechtliche Hinweise zur Nutzung der App
            </DialogDescription>
          </DialogHeader>
          <DisclaimerContent />
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}
