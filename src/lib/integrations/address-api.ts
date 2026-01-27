/**
 * NZ Address API Integration
 * Provides address autocomplete and validation for New Zealand addresses
 * Uses the LINZ Data Service / NZ Post APIs
 */

export interface NZAddress {
  id: string;
  fullAddress: string;
  streetNumber: string;
  streetName: string;
  streetType: string;
  suburb: string;
  city: string;
  region: string;
  postcode: string;
  lat: number;
  lng: number;
  dpid?: string; // Delivery Point ID
  meshblock?: string;
  sa2?: string; // Statistical Area 2
}

export interface AddressSuggestion {
  id: string;
  address: string;
  highlight?: string;
  metadata?: {
    suburb?: string;
    city?: string;
    postcode?: string;
  };
}

// NZ Regions mapping
const REGION_MAP: Record<string, string> = {
  "auckland": "Auckland",
  "northland": "Northland",
  "waikato": "Waikato",
  "bay of plenty": "Bay of Plenty",
  "gisborne": "Gisborne",
  "hawke's bay": "Hawke's Bay",
  "taranaki": "Taranaki",
  "manawatu-whanganui": "Manawatu-Whanganui",
  "manawatu-wanganui": "Manawatu-Whanganui",
  "wellington": "Wellington",
  "tasman": "Tasman",
  "nelson": "Nelson",
  "marlborough": "Marlborough",
  "west coast": "West Coast",
  "canterbury": "Canterbury",
  "otago": "Otago",
  "southland": "Southland",
};

// City to region mapping for common NZ cities
const CITY_REGION_MAP: Record<string, string> = {
  "auckland": "auckland",
  "manukau": "auckland",
  "waitakere": "auckland",
  "north shore": "auckland",
  "hamilton": "waikato",
  "tauranga": "bay-of-plenty",
  "wellington": "wellington",
  "lower hutt": "wellington",
  "upper hutt": "wellington",
  "porirua": "wellington",
  "christchurch": "canterbury",
  "dunedin": "otago",
  "palmerston north": "manawatu-whanganui",
  "napier": "hawkes-bay",
  "hastings": "hawkes-bay",
  "rotorua": "bay-of-plenty",
  "new plymouth": "taranaki",
  "whangarei": "northland",
  "invercargill": "southland",
  "nelson": "nelson",
  "gisborne": "gisborne",
  "blenheim": "marlborough",
  "greymouth": "west-coast",
  "timaru": "canterbury",
  "whanganui": "manawatu-whanganui",
  "queenstown": "otago",
};

/**
 * Search for address suggestions
 * Uses Google Places API or similar for autocomplete
 */
export async function searchAddresses(
  query: string,
  limit: number = 5
): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) {
    return [];
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (apiKey) {
    return searchWithGooglePlaces(query, limit, apiKey);
  }

  // Fallback to basic local search
  return searchLocal(query, limit);
}

/**
 * Search using Google Places API
 */
async function searchWithGooglePlaces(
  query: string,
  limit: number,
  apiKey: string
): Promise<AddressSuggestion[]> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("components", "country:nz");
    url.searchParams.set("types", "address");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return [];
    }

    return (data.predictions || []).slice(0, limit).map((p: {
      place_id: string;
      description: string;
      structured_formatting?: {
        main_text_matched_substrings?: Array<{ offset: number; length: number }>;
        main_text?: string;
        secondary_text?: string;
      };
      terms?: Array<{ value: string }>;
    }) => {
      // Parse structured formatting for metadata
      const terms = p.terms || [];
      const city = terms.length > 1 ? terms[terms.length - 2]?.value : undefined;
      const postcode = terms.length > 0 && /^\d{4}$/.test(terms[0]?.value)
        ? terms[0].value
        : undefined;

      return {
        id: p.place_id,
        address: p.description.replace(", New Zealand", ""),
        highlight: p.structured_formatting?.main_text,
        metadata: {
          city,
          postcode,
        },
      };
    });
  } catch (error) {
    console.error("Google Places search error:", error);
    return searchLocal(query, limit);
  }
}

/**
 * Basic local address search fallback
 * Uses common NZ address patterns
 */
function searchLocal(query: string, limit: number): Promise<AddressSuggestion[]> {
  // This is a fallback that provides basic suggestions
  // In production, this should be replaced with a proper NZ address database
  const suggestions: AddressSuggestion[] = [];

  // Extract potential components
  const parts = query.toLowerCase().split(/[\s,]+/);

  // Check for city matches
  for (const city of Object.keys(CITY_REGION_MAP)) {
    if (parts.some(p => city.includes(p) || p.includes(city))) {
      suggestions.push({
        id: `local-${city}`,
        address: `${query}, ${city.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`,
        metadata: {
          city: city.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        },
      });
    }
  }

  return Promise.resolve(suggestions.slice(0, limit));
}

/**
 * Get full address details from a place ID
 */
export async function getAddressDetails(placeId: string): Promise<NZAddress | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn("Google Places API key not configured");
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("fields", "address_components,geometry,formatted_address");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Place Details API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Place Details API error:", data.status, data.error_message);
      return null;
    }

    const result = data.result;
    const components = result.address_components || [];

    // Extract address components
    const getComponent = (types: string[]) => {
      const comp = components.find((c: { types: string[]; long_name: string }) =>
        types.some(t => c.types.includes(t))
      );
      return comp?.long_name || "";
    };

    const streetNumber = getComponent(["street_number"]);
    const streetName = getComponent(["route"]);
    const suburb = getComponent(["sublocality", "sublocality_level_1", "neighborhood"]);
    const city = getComponent(["locality", "administrative_area_level_2"]);
    const regionName = getComponent(["administrative_area_level_1"]);
    const postcode = getComponent(["postal_code"]);

    // Determine region slug
    const regionSlug = Object.entries(CITY_REGION_MAP).find(
      ([cityName]) => city.toLowerCase().includes(cityName)
    )?.[1] || regionName.toLowerCase().replace(/[^a-z]/g, "-");

    return {
      id: placeId,
      fullAddress: result.formatted_address?.replace(", New Zealand", "") || "",
      streetNumber,
      streetName,
      streetType: "", // Google doesn't separate this
      suburb,
      city,
      region: regionSlug,
      postcode,
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
    };
  } catch (error) {
    console.error("Error getting address details:", error);
    return null;
  }
}

/**
 * Validate a New Zealand address
 */
export function validateNZAddress(address: Partial<NZAddress>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!address.streetName && !address.fullAddress) {
    errors.push("Street address is required");
  }

  if (!address.city && !address.suburb) {
    errors.push("City or suburb is required");
  }

  if (address.postcode && !/^\d{4}$/.test(address.postcode)) {
    errors.push("Invalid postcode format (must be 4 digits)");
  }

  // Validate coordinates if provided
  if (address.lat !== undefined && address.lng !== undefined) {
    // NZ bounds: approximately -47.5 to -34.0 lat, 166.0 to 179.0 lng
    if (address.lat < -47.5 || address.lat > -34.0) {
      errors.push("Latitude is outside New Zealand bounds");
    }
    if (address.lng < 166.0 || address.lng > 179.0) {
      errors.push("Longitude is outside New Zealand bounds");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse a full address string into components
 */
export function parseAddressString(address: string): Partial<NZAddress> {
  const result: Partial<NZAddress> = {
    fullAddress: address,
  };

  // Split by commas
  const parts = address.split(",").map(p => p.trim());

  if (parts.length >= 1) {
    // First part usually street address
    const streetMatch = parts[0].match(/^(\d+[A-Za-z]?)\s+(.+)$/);
    if (streetMatch) {
      result.streetNumber = streetMatch[1];
      result.streetName = streetMatch[2];
    } else {
      result.streetName = parts[0];
    }
  }

  if (parts.length >= 2) {
    // Second part could be suburb or city
    const secondPart = parts[1].toLowerCase();
    if (Object.keys(CITY_REGION_MAP).some(c => secondPart.includes(c))) {
      result.city = parts[1];
    } else {
      result.suburb = parts[1];
    }
  }

  if (parts.length >= 3) {
    // Third part could be city or postcode
    const thirdPart = parts[2];
    if (/^\d{4}$/.test(thirdPart)) {
      result.postcode = thirdPart;
    } else {
      result.city = thirdPart;
    }
  }

  if (parts.length >= 4) {
    // Fourth part postcode
    const fourthPart = parts[3];
    if (/^\d{4}$/.test(fourthPart)) {
      result.postcode = fourthPart;
    }
  }

  // Try to determine region from city
  if (result.city) {
    const cityLower = result.city.toLowerCase();
    for (const [city, region] of Object.entries(CITY_REGION_MAP)) {
      if (cityLower.includes(city)) {
        result.region = region;
        break;
      }
    }
  }

  return result;
}

/**
 * Get region display name from slug
 */
export function getRegionDisplayName(slug: string): string {
  const normalized = slug.toLowerCase().replace(/-/g, " ");
  return REGION_MAP[normalized] || slug.split("-").map(
    w => w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
}

/**
 * Get all NZ regions for dropdown
 */
export function getNZRegions(): Array<{ value: string; label: string }> {
  return [
    { value: "northland", label: "Northland" },
    { value: "auckland", label: "Auckland" },
    { value: "waikato", label: "Waikato" },
    { value: "bay-of-plenty", label: "Bay of Plenty" },
    { value: "gisborne", label: "Gisborne" },
    { value: "hawkes-bay", label: "Hawke's Bay" },
    { value: "taranaki", label: "Taranaki" },
    { value: "manawatu-whanganui", label: "Manawatu-Whanganui" },
    { value: "wellington", label: "Wellington" },
    { value: "tasman", label: "Tasman" },
    { value: "nelson", label: "Nelson" },
    { value: "marlborough", label: "Marlborough" },
    { value: "west-coast", label: "West Coast" },
    { value: "canterbury", label: "Canterbury" },
    { value: "otago", label: "Otago" },
    { value: "southland", label: "Southland" },
  ];
}
