/**
 * E2E Tests: Story 5.5 — Audit-Log für Datenzugriffe
 *
 * Testet:
 * 10.1 Arzt greift auf Sharing-Dashboard zu → dashboard_view Eintrag im audit_log
 * 10.2 Patient sieht Zugriffsprotokolle auf der Mehr-Seite
 * 10.3 Empty-State wenn keine Einträge vorhanden
 */
import { expect, test } from '@playwright/test'

import { test as authTest } from './fixtures/auth.fixture'
import {
  cleanupTestAuditEntries,
  cleanupTestSharingLinks,
  createTestAuditEntry,
  createTestSharingLink,
  generateTestToken,
  getAuditEntriesForLink,
  getTestUserId,
} from './fixtures/test-data'

let testUserId: string

test.beforeAll(async () => {
  testUserId = await getTestUserId()
  await cleanupTestAuditEntries(testUserId)
  await cleanupTestSharingLinks(testUserId)
})

test.afterAll(async () => {
  await cleanupTestAuditEntries(testUserId)
  await cleanupTestSharingLinks(testUserId)
})

test.describe('Audit-Log: Zugriffs-Tracking', () => {
  test('10.1 — dashboard_view Eintrag wird nach Arzt-Zugriff erstellt', async ({
    browser,
  }) => {
    const token = generateTestToken()
    const sharingLink = await createTestSharingLink(testUserId, {
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Arzt ruft Sharing-Link auf (anonymer Browser-Kontext)
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`/share/${token}`)
    // Token-Validierung → Weiterleitung zum Dashboard
    await page.waitForURL('**/share/dashboard', { timeout: 10000 })

    await context.close()

    // Audit-Eintrag prüfen (Polling statt fixem Timeout — robuster in CI)
    let entries: Awaited<ReturnType<typeof getAuditEntriesForLink>> = []
    await expect
      .poll(
        async () => {
          entries = await getAuditEntriesForLink(sharingLink.id)
          return entries.length
        },
        {
          timeout: 5000,
          message: 'Audit-Eintrag wurde nicht innerhalb 5s geschrieben',
        },
      )
      .toBeGreaterThanOrEqual(1)

    const dashboardEntry = entries.find((e) => e.action === 'dashboard_view')
    expect(dashboardEntry).toBeDefined()
    expect(dashboardEntry!.account_id).toBe(testUserId)
    expect(dashboardEntry!.sharing_link_id).toBe(sharingLink.id)
    // IP-Adresse ist gehasht (kein Klartext)
    if (dashboardEntry!.ip_address_hash) {
      expect(dashboardEntry!.ip_address_hash).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})

test.describe('Audit-Log: Patient-Ansicht (Mehr-Seite)', () => {
  authTest(
    '10.2 — Patient sieht Audit-Einträge unter Zugriffsprotokolle',
    async ({ page }) => {
      // Sharing-Link und Audit-Eintrag erstellen
      const link = await createTestSharingLink(testUserId, {
        date_from: '2026-02-01',
        date_to: '2026-03-15',
      })
      await createTestAuditEntry(testUserId, link.id, {
        action: 'dashboard_view',
      })

      await page.goto('/more')
      await page.waitForLoadState('networkidle')

      // Zugriffsprotokolle-Sektion sichtbar
      await expect(page.getByText('Zugriffsprotokolle')).toBeVisible()

      // Audit-Eintrag sichtbar
      await expect(page.getByText('Dashboard angesehen').first()).toBeVisible()
    },
  )

  authTest(
    '10.3 — Empty-State wenn keine Audit-Einträge vorhanden',
    async ({ page }) => {
      // Sicherstellen dass keine Einträge für diesen User existieren
      await cleanupTestAuditEntries(testUserId)

      await page.goto('/more')
      await page.waitForLoadState('networkidle')

      // Zugriffsprotokolle-Sektion vorhanden
      await expect(page.getByText('Zugriffsprotokolle')).toBeVisible()

      // Empty-State Message
      await expect(
        page.getByText('Noch keine Zugriffe auf deine Daten.'),
      ).toBeVisible()
    },
  )
})
