function findClosestCoordinate(coordinates, pLng, pLat) {
    if (coordinates.length === 0) {
        return null; // Handle empty LineString
    }

    let closestIndex = 0;
    let closestDistance = haversineDistance(coordinates[0][0], coordinates[0][1], pLat, pLng);

    for (let i = 1; i < coordinates.length; i++) {
        const [lng, lat] = coordinates[i];
        const distance = haversineDistance(lat, lng, pLat, pLng);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    }

    return {
        index: closestIndex,
        distance: closestDistance
    };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getPriceFromDistance(distanceInKm) {
    // Define the range of distances and corresponding prices
    const minDistance = 100;
    const maxDistance = 4000;
    const minPrice = 2;
    const maxPrice = 1.7;

    // Ensure the distance is within the specified range
    const clampedDistance = Math.min(Math.max(distanceInKm, minDistance), maxDistance);

    // Calculate the interpolation factor (a value between 0 and 1)
    const t = (clampedDistance - minDistance) / (maxDistance - minDistance);

    // Use linear interpolation formula to calculate the price
    const interpolatedPrice = minPrice + t * (maxPrice - minPrice);

    // Round the result to a desired precision
    const roundedPrice = parseFloat(interpolatedPrice.toFixed(3));

    return roundedPrice;
}

function calculateTotalDistance(lineStringCoords = []) {
    return lineStringCoords.reduce((distance, [lng, lat], index) => {
        if (index === 0) return distance;
        return distance + haversineDistance(lineStringCoords[index - 1][1], lineStringCoords[index - 1][0], lat, lng);
    }, 0);
}

module.exports = {
    findClosestCoordinate,
    haversineDistance,
    getPriceFromDistance,
    calculateTotalDistance,
}