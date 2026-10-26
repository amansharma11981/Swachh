import { describe, expect, it } from 'vitest'
import { nearestConfiguredZone } from './zoneMatching.js'

const zones = [
  { zoneId: 'outer', name: 'Outer zone', geofence: { latitude: 25.62, longitude: 85.17, radiusMeters: 1000 } },
  { zoneId: 'inner', name: 'Inner zone', geofence: { latitude: 25.6201, longitude: 85.1701, radiusMeters: 400 } },
  { zoneId: 'manual', name: 'Manual only', geofence: null },
]

describe('nearestConfiguredZone', () => {
  it('chooses the closest configured center when radii overlap', () => {
    expect(nearestConfiguredZone(zones, 25.6201, 85.1701)?.zoneId).toBe('inner')
  })

  it('returns null outside every approximate radius', () => {
    expect(nearestConfiguredZone(zones, 26, 86)).toBeNull()
  })

  it('ignores unconfigured zones and invalid coordinates', () => {
    expect(nearestConfiguredZone([{ zoneId: 'manual', geofence: null }], 25.62, 85.17)).toBeNull()
    expect(nearestConfiguredZone(zones, '', 85.17)).toBeNull()
    expect(nearestConfiguredZone(zones, 91, 85.17)).toBeNull()
  })
})
