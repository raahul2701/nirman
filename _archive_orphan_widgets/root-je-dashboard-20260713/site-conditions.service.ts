import { SiteConditionsDTO } from '../config/site-conditions.config';

const mockSiteConditions: SiteConditionsDTO = {
  temperature: 32,
  humidity: 75,
  windSpeed: 15,
  rainProbability: 80,
  heatIndex: 38,
  alert: 'Heavy rain warning issued for the next 3 hours.',
};

/**
 * Service to fetch site conditions data.
 */
export const siteConditionsService = {
  getSiteConditions: async (lat: number, lon: number): Promise<SiteConditionsDTO> => {
    // TODO(API): Replace with an actual API call to a weather service
    // using the provided lat/lon and VITE_OPENWEATHER_API_KEY.
    console.log(`Fetching weather for coords: ${lat}, ${lon}`);
    return Promise.resolve(mockSiteConditions);
  },
};