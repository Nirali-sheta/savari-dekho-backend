const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

function processGeocodeResult(result) {
    const addressComponents = result.address_components;

    // Define the types to prioritize for primary text
    const primaryTypes = ['street_number', 'route', 'locality', 'sublocality', 'postal_code'];
    // addressComponents.forEach(comp => console.log(comp))

    // Define the types to ignore for both primary and secondary text
    const ignoredTypes = ['plus_code'];

    // Extract primary and secondary text
    let primaryText = '';
    let secondaryText = '';

    addressComponents.forEach(component => {
        if (ignoredTypes.includes(component.types[0])) {
            // Skip components related to plus codes
            return;
        }

        if (primaryTypes.some(type => component.types.includes(type))) {
            // If the component type is in the primaryTypes list, use it for primary text
            primaryText += `${component.long_name}, `;
        } else {
            // Otherwise, add it to secondary text
            secondaryText += `${component.long_name}, `;
        }
    });

    // Remove trailing commas
    primaryText = primaryText.replace(/,\s*$/, '');
    secondaryText = secondaryText.replace(/,\s*$/, '');

    return {
        primaryText,
        secondaryText,
    };
}
function reverseGeocode([lng, lat]) {
    return new Promise((res, rej) => {
        client.reverseGeocode({
            params: {
                key: process.env.GOOGLE_MAPS_API_KEY,
                latlng: `${lat},${lng}`,
                location_type: "ROOFTOP|RANGE_INTERPOLATED|GEOMETRIC_CENTER",
                // result_type: "establishment|point_of_interest"
            }
        }).then(response => {
            const results = response.data.results;
            if (results && results.length > 0) {
                const formattedAddress = processGeocodeResult(results[0]);
                res(formattedAddress);
            } else {
                rej("No results found");
            }
        }).catch(err => rej(err.message))
    })
}

module.exports = reverseGeocode;