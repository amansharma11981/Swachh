import { describe, expect, it } from 'vitest'
import { normalizeApiBaseUrl } from './apiClient.js'

describe('normalizeApiBaseUrl', () => {
  it('uses the local API prefix when no base is configured', () => {
    expect(normalizeApiBaseUrl()).toBe('/api/v1')
  })

  it('adds the versioned API prefix when given a Railway host only', () => {
    expect(normalizeApiBaseUrl('https://swachhai-api-production.up.railway.app/'))
      .toBe('https://swachhai-api-production.up.railway.app/api/v1')
  })

  it('preserves a configured API path and removes its trailing slash', () => {
    expect(normalizeApiBaseUrl('https://api.example.test/api/v1/'))
      .toBe('https://api.example.test/api/v1')
  })
})
