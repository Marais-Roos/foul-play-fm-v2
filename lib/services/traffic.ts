import { fetchStructuredTomTomTraffic, TrafficIncidentItem } from './bulletin-service';

export interface GautengTrafficSummary {
  timestamp: string;
  incidents: TrafficIncidentItem[];
  promptSummary: string;
}

/**
 * Ingests live traffic from TomTom Incident API if TOMTOM_API_KEY is present.
 * Strictly zero fake or satirical placeholder incidents.
 */
export async function getGautengTraffic(): Promise<GautengTrafficSummary> {
  const incidents = await fetchStructuredTomTomTraffic();

  const promptSummary =
    incidents.length > 0
      ? incidents
          .map((i) => `${i.road}: ${i.delayMinutes} min delay (${i.description})`)
          .join(' | ')
      : 'All major Gauteng highway corridors currently running clear with zero incident delays reported.';

  return {
    timestamp: new Date().toISOString(),
    incidents,
    promptSummary,
  };
}
