import { SiteConditionsDTO, SiteConditionsViewModel } from '../config/site-conditions.config';

const generateWorkAdvisory = (dto: SiteConditionsDTO): SiteConditionsViewModel['workAdvisory'] => {
  if (dto.rainProbability > 70) {
    return { text: 'Heavy rain expected. Secure materials and halt excavation.', variant: 'critical' };
  }
  if (dto.heatIndex > 40) {
    return { text: 'High heat index. Ensure hydration for all workers.', variant: 'warning' };
  }
  if (dto.windSpeed > 40) {
    return { text: 'High winds. Cease all crane and height-related work.', variant: 'critical' };
  }
  if (dto.rainProbability > 40) {
    return { text: 'Rain likely. Plan concrete work accordingly.', variant: 'warning' };
  }
  return { text: 'Normal conditions. Proceed with planned activities.', variant: 'default' };
};

export const mapSiteConditionsDtoToVm = (dto: SiteConditionsDTO): SiteConditionsViewModel => {
  return {
    temperature: `${Math.round(dto.temperature)}°C`,
    humidity: `${dto.humidity}%`,
    wind: `${Math.round(dto.windSpeed)} km/h`,
    rain: `${dto.rainProbability}%`,
    heatIndex: `${Math.round(dto.heatIndex)}°C`,
    workAdvisory: generateWorkAdvisory(dto),
  };
};