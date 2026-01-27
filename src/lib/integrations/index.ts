/**
 * NZ Integrations Index
 * Weather and Address APIs for New Zealand
 */

export {
  getCurrentWeather,
  getWeatherForecast,
  formatWeatherForReport,
  assessInspectionConditions,
  type WeatherData,
  type WeatherForecast,
} from "./weather-api";

export {
  searchAddresses,
  getAddressDetails,
  validateNZAddress,
  parseAddressString,
  getRegionDisplayName,
  getNZRegions,
  type NZAddress,
  type AddressSuggestion,
} from "./address-api";
