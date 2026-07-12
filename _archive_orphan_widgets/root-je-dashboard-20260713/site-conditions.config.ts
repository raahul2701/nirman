/**
 * Data Transfer Object (DTO) for raw weather data from the API.
 */
export type SiteConditionsDTO = {
  temperature: number;
  humidity: number;
  windSpeed: number; // in km/h
  rainProbability: number; // percentage
  heatIndex: number;
  alert?: string;
};

/**
 * View Model for site conditions, shaped for the UI.
 */
export interface SiteConditionsViewModel {
  temperature: string;
  humidity: string;
  wind: string;
  rain: string;
  heatIndex: string;
  workAdvisory: {
    text: string;
    variant: 'default' | 'warning' | 'critical';
  };
}