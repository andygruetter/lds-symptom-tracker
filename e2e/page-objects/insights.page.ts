import type { Locator, Page } from '@playwright/test'

export class InsightsPage {
  readonly page: Page
  readonly heading: Locator
  readonly feedTab: Locator
  readonly timelineTab: Locator
  readonly rankingTab: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Auswertung' })
    this.feedTab = page.getByRole('tab', { name: 'Feed' })
    this.timelineTab = page.getByRole('tab', { name: 'Timeline' })
    this.rankingTab = page.getByRole('tab', { name: 'Ranking' })
  }

  async goto() {
    await this.page.goto('/insights')
  }

  async waitForLoaded() {
    await this.heading.waitFor({ timeout: 10_000 })
  }

  async switchToFeed() {
    await this.feedTab.click()
  }

  async switchToTimeline() {
    await this.timelineTab.click()
  }

  async switchToRanking() {
    await this.rankingTab.click()
  }

  /** Returns all feed event cards (links) in the Feed tab */
  getFeedEvents() {
    return this.page.locator('[data-testid="feed-event"]')
  }

  /** Click on a specific feed event by index (0-based) */
  async openFeedEvent(index: number) {
    await this.getFeedEvents().nth(index).click()
  }

  /** Returns the empty state message when no events exist */
  getEmptyState() {
    return this.page.getByText('Noch keine Events erfasst')
  }
}
