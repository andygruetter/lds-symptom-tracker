/**
 * E2E Tests: Story 5.4 — Automatisches Ablaufen + Widerruf von Sharing-Links
 *
 * Testet:
 * 9.1 Abgelaufener Link → Redirect auf /share/expired
 * 9.2 Widerrufener Link → Redirect auf /share/expired
 * 9.3 Aktiver Link → Normaler Zugriff
 * 9.4 Patient widerruft Link → Link-Status in DB + UI-Badge
 * 9.5 Mehr-Seite zeigt aktive + abgelaufene + widerrufene Links korrekt
 * 9.6 Bestätigungs-Dialog vor Widerruf
 * 9.7 RLS — Patient sieht nur eigene Links
 */
import { test, expect } from './fixtures/auth.fixture'
import {
  cleanupTestSharingLinks,
  createTestSharingLink,
  generateTestToken,
  getSharingLink,
  getTestUserId,
} from './fixtures/test-data'

let testUserId: string

test.beforeAll(async () => {
  testUserId = await getTestUserId()
  await cleanupTestSharingLinks(testUserId)
})

test.afterAll(async () => {
  await cleanupTestSharingLinks(testUserId)
})

test.describe('Sharing-Link Ablauf & Widerruf', () => {
  test.describe('Token-Validierung (/share/[token])', () => {
    test('9.1 — abgelaufener Link leitet auf /share/expired um', async ({
      page,
    }) => {
      const token = generateTestToken()
      await createTestSharingLink(testUserId, {
        token,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
      })

      await page.goto(`/share/${token}`)

      await page.waitForURL('**/share/expired')
      await expect(page.getByText('Dieser Link ist abgelaufen')).toBeVisible()
    })

    test('9.2 — widerrufener Link leitet auf /share/expired um', async ({
      page,
    }) => {
      const token = generateTestToken()
      await createTestSharingLink(testUserId, {
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // future
        revoked_at: new Date().toISOString(), // revoked now
      })

      await page.goto(`/share/${token}`)

      await page.waitForURL('**/share/expired')
      await expect(page.getByText('Dieser Link ist abgelaufen')).toBeVisible()
    })

    test('9.3 — aktiver Link leitet auf /share/dashboard weiter', async ({
      page,
    }) => {
      const token = generateTestToken()
      await createTestSharingLink(testUserId, {
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      await page.goto(`/share/${token}`)

      await page.waitForURL('**/share/dashboard**')
      await expect(page.getByText('Events im Zeitraum')).toBeVisible()
    })
  })

  test.describe('Mehr-Seite: Link-Verwaltung', () => {
    test('9.5 — zeigt aktive, abgelaufene und widerrufene Links mit Status-Badges', async ({
      page,
    }) => {
      // Cleanup + create 3 links with different states
      await cleanupTestSharingLinks(testUserId)

      await createTestSharingLink(testUserId, {
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      await createTestSharingLink(testUserId, {
        expires_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // expired
      })
      await createTestSharingLink(testUserId, {
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        revoked_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // revoked
      })

      await page.goto('/more')

      await expect(page.getByText('Aktiv', { exact: true })).toBeVisible()
      await expect(page.getByText('Abgelaufen', { exact: true })).toBeVisible()
      // Badge <span> specifically — button also says "Widerrufen" on the active link
      await expect(
        page.locator('span').filter({ hasText: /^Widerrufen$/ }),
      ).toBeVisible()
    })

    test('9.6 — Bestätigungs-Dialog erscheint vor Widerruf und kann abgebrochen werden', async ({
      page,
    }) => {
      await cleanupTestSharingLinks(testUserId)

      await createTestSharingLink(testUserId, {
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })

      await page.goto('/more')

      // Click Widerrufen button
      await page.getByRole('button', { name: 'Link widerrufen' }).click()

      // Dialog should appear
      await expect(page.getByText('Link wirklich widerrufen?')).toBeVisible()
      await expect(
        page.getByText('Der Arzt kann danach nicht mehr'),
      ).toBeVisible()

      // Cancel
      await page.getByRole('button', { name: 'Abbrechen' }).click()

      // Link should still be active
      await expect(page.getByText('Aktiv')).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Link widerrufen' }),
      ).toBeVisible()
    })

    test('9.4 — Patient widerruft Link erfolgreich: UI-Badge + DB-Status', async ({
      page,
    }) => {
      await cleanupTestSharingLinks(testUserId)

      const link = await createTestSharingLink(testUserId, {
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })

      await page.goto('/more')

      // Verify initially active
      await expect(page.getByText('Aktiv')).toBeVisible()

      // Click Widerrufen
      await page.getByRole('button', { name: 'Link widerrufen' }).click()

      // Confirm in dialog
      await page.getByText('Link wirklich widerrufen?').waitFor()
      await page.getByRole('button', { name: 'Widerrufen' }).click()

      // Wait for dialog to close and optimistic update
      await expect(
        page.getByText('Link wirklich widerrufen?'),
      ).not.toBeVisible()
      await expect(page.getByText('Aktiv', { exact: true })).not.toBeVisible()
      // "Widerrufen am [Datum]" only appears for revoked links
      await expect(page.getByText(/Widerrufen am /)).toBeVisible()

      // Verify DB state
      const updated = await getSharingLink(link.id)
      expect(updated.revoked_at).not.toBeNull()
    })

    test('9.7 — Patient sieht nur eigene Links (RLS SELECT)', async ({
      page,
    }) => {
      await cleanupTestSharingLinks(testUserId)

      // Create a link for the test user
      await createTestSharingLink(testUserId, {
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })

      await page.goto('/more')

      // Test user's link should be visible
      await expect(page.getByText('Aktiv')).toBeVisible()

      // Only 1 link card should exist (no other user's links)
      const linkCards = page.locator('[class*="items-start justify-between"]')
      await expect(linkCards).toHaveCount(1)
    })
  })
})
