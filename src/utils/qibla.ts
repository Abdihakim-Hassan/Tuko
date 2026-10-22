// Kaaba coordinates in Mecca, Saudi Arabia
export const KAABA_LAT = 21.422487;
export const KAABA_LON = 39.826206;

/**
 * Calculates the Qibla angle (in degrees 0-360 clockwise from True North)
 * from any given latitude and longitude.
 */
export function calculateQiblaDirection(latitude: number, longitude: number): number {
  const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
  const kaabaLonRad = (KAABA_LON * Math.PI) / 180;
  const userLatRad = (latitude * Math.PI) / 180;
  const userLonRad = (longitude * Math.PI) / 180;

  const deltaLon = kaabaLonRad - userLonRad;

  const y = Math.sin(deltaLon);
  const x =
    Math.cos(userLatRad) * Math.tan(kaabaLatRad) -
    Math.sin(userLatRad) * Math.cos(deltaLon);

  let qiblaAngle = (Math.atan2(y, x) * 180) / Math.PI;
  qiblaAngle = (qiblaAngle + 360) % 360;

  return Math.round(qiblaAngle * 10) / 10;
}

/**
 * Calculates distance to Kaaba in kilometers using the Haversine formula
 */
export function calculateDistanceToKaaba(latitude: number, longitude: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((KAABA_LAT - latitude) * Math.PI) / 180;
  const dLon = ((KAABA_LON - longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latitude * Math.PI) / 180) *
      Math.cos((KAABA_LAT * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
