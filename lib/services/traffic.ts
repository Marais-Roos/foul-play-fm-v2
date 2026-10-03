import { stationBible } from '../data/station';
import { TrafficCorridor } from '../types/station';

export interface TrafficIncident {
  id: string;
  corridor: TrafficCorridor;
  location: string;
  severity: 'low' | 'moderate' | 'severe' | 'gridlock';
  delayMinutes: number;
  description: string;
  isMockFallback?: boolean;
}

export interface GautengTrafficSummary {
  timestamp: string;
  incidents: TrafficIncident[];
  promptSummary: string;
}

const SATIRICAL_INCIDENT_POOL: Array<Omit<TrafficIncident, 'corridor'>> = [
  {
    id: 'n1-buccleuch-chaos',
    location: 'N1 Northbound at Buccleuch Interchange',
    severity: 'gridlock',
    delayMinutes: 55,
    description: 'Complete standstill as 4 lanes merge into a pothole crater; drivers currently exchanging phone numbers and biltong.',
  },
  {
    id: 'm1-double-decker',
    location: 'M1 Southbound before Empire Road',
    severity: 'severe',
    delayMinutes: 35,
    description: 'Overturned trailer carrying scrap copper; traffic backed up to Grayston Drive in Sandton.',
  },
  {
    id: 'r21-blue-light',
    location: 'R21 Southbound near Pomona / OR Tambo',
    severity: 'moderate',
    delayMinutes: 20,
    description: 'VIP Blue Light convoy escorted through traffic at 180 km/h, forcing all commuters onto the dirt shoulder.',
  },
  {
    id: 'n4-brits-toll',
    location: 'N4 Westbound outside Brits Toll Plaza',
    severity: 'moderate',
    delayMinutes: 25,
    description: 'Chrome mining haul truck broke an axle; local citrus farmers protesting e-tolls on horseback.',
  },
  {
    id: 'n12-east-rand',
    location: 'N12 Eastbound near Atlas Road, Boksburg',
    severity: 'severe',
    delayMinutes: 40,
    description: 'Modified Ford Cortina drag race gone wrong; highway patrol currently taking self-defense tips from onlookers.',
  },
];

/**
 * Ingests live traffic from TomTom Incident API if TOMTOM_API_KEY is present,
 * or pulls randomized satirical highveld traffic incidents from the pool.
 */
export async function getGautengTraffic(): Promise<GautengTrafficSummary> {
  const apiKey = process.env.TOMTOM_API_KEY;
  const corridors = stationBible.station.trafficCorridors;
  const incidents: TrafficIncident[] = [];

  if (apiKey) {
    try {
      // TomTom Incidents API bounding box for Gauteng: -26.9, 27.5 to -25.5, 28.5
      const bbox = '27.5,-26.9,28.5,-25.5';
      const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code}}}}&key=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 600 } });
      
      if (res.ok) {
        const data = await res.json();
        // Parse TomTom raw incidents if present
        if (data.incidents && data.incidents.length > 0) {
          for (let i = 0; i < Math.min(data.incidents.length, 5); i++) {
            const inc = data.incidents[i];
            const corridor = corridors[i % corridors.length];
            incidents.push({
              id: `tomtom-${i}`,
              corridor,
              location: corridor.name,
              severity: inc.properties.magnitudeOfDelay > 2 ? 'severe' : 'moderate',
              delayMinutes: inc.properties.magnitudeOfDelay * 12 + 10,
              description: inc.properties.events?.[0]?.description || 'Severe congestion and vehicle breakdown',
            });
          }
        }
      }
    } catch {
      // Network/API failure -> fallback to pool
    }
  }

  // If no incidents retrieved from live API, select 3 contextual ones from the satirical pool
  if (incidents.length === 0) {
    const selected = SATIRICAL_INCIDENT_POOL.slice(0, 3);
    for (const item of selected) {
      const matchingCorridor = corridors.find(c => item.id.startsWith(c.id)) || corridors[0];
      incidents.push({
        ...item,
        corridor: matchingCorridor,
        isMockFallback: true,
      });
    }
  }

  const promptSummary = incidents
    .map(i => `${i.location}: ${i.delayMinutes} min delay (${i.description})`)
    .join(' | ');

  return {
    timestamp: new Date().toISOString(),
    incidents,
    promptSummary,
  };
}
