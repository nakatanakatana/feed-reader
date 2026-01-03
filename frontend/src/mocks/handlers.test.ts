import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { worker } from './browser'

describe('FeedService Mock Handlers', () => {
  beforeAll(async () => {
    // Start the worker in the browser environment
    await worker.start({
      onUnhandledRequest: 'bypass'
    })
  })

  afterAll(() => {
    // Stop the worker
    worker.stop()
  })

  it('should mock ListFeeds', async () => {
    const response = await fetch('/feed.v1.FeedService/ListFeeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('feeds')
    expect(Array.isArray(data.feeds)).toBe(true)
    expect(data.feeds.length).toBeGreaterThan(0)
  })

  it('should mock CreateFeed', async () => {
    const feedData = { url: 'https://example.com/feed.xml', title: 'Example Feed' }
    const response = await fetch('/feed.v1.FeedService/CreateFeed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedData)
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('feed')
    expect(data.feed.url).toBe(feedData.url)
    expect(data.feed.title).toBe(feedData.title)
    expect(data.feed.uuid).toBeDefined()
  })

  it('should mock DeleteFeed', async () => {
    // Get current feeds first
    const listResponse = await fetch('/feed.v1.FeedService/ListFeeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const listData = await listResponse.json()
    const uuidToDelete = listData.feeds[0].uuid

    const response = await fetch('/feed.v1.FeedService/DeleteFeed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid: uuidToDelete })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({})

    // Verify it's deleted
    const listResponseAfter = await fetch('/feed.v1.FeedService/ListFeeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const listDataAfter = await listResponseAfter.json()
    expect(listDataAfter.feeds.find((f: any) => f.uuid === uuidToDelete)).toBeUndefined()
  })
})