function distanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radians = (value) => value * Math.PI / 180
  const deltaLatitude = radians(latitudeB - latitudeA)
  const deltaLongitude = radians(longitudeB - longitudeA)
  const haversine = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function nearestConfiguredZone(zones, latitude, longitude) {
  const lat = Number(latitude), lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return (zones || []).reduce((nearest, zone) => {
    const fence = zone.geofence
    if (!fence || !Number.isFinite(Number(fence.latitude)) || !Number.isFinite(Number(fence.longitude)) || !Number.isFinite(Number(fence.radiusMeters))) return nearest
    const distance = distanceMeters(lat, lng, Number(fence.latitude), Number(fence.longitude))
    if (distance > Number(fence.radiusMeters) || (nearest && distance >= nearest.distance)) return nearest
    return { ...zone, distance: Math.round(distance) }
  }, null)
}
