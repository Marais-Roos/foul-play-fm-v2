import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export interface RadioAsset {
  key: string;
  name: string;
  url: string;
  size: number;
  category: 'advert' | 'sweeper' | 'show-sweeper' | 'stinger' | 'bed' | 'sfx';
}

export interface RadioAssetCatalog {
  adverts: RadioAsset[];
  sweepers: RadioAsset[];
  showSweepers: RadioAsset[];
  newsBeds: RadioAsset[];
  trafficAmbience: RadioAsset[];
  stingers: RadioAsset[];
  beds: RadioAsset[];
  sfx: RadioAsset[];
  lastFetched: number;
}

// In-memory cache for 60 seconds
let cachedCatalog: RadioAssetCatalog | null = null;
const CACHE_TTL_MS = 60 * 1000;

function getS3Client(): S3Client | null {
  const accountId = (process.env.R2_ACCOUNT_ID || '').replace(/^["']|["']$/g, '');
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').replace(/^["']|["']$/g, '');
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').replace(/^["']|["']$/g, '');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function cleanNameFromKey(key: string): string {
  const filename = key.split('/').pop() || key;
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

/**
 * Lists all assets from Cloudflare R2 bucket and categorizes them.
 * Auto-refreshes every 60s so newly uploaded dashboard files are picked up.
 */
export async function getR2AssetCatalog(): Promise<RadioAssetCatalog> {
  const now = Date.now();
  if (cachedCatalog && now - cachedCatalog.lastFetched < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  const bucketName = (process.env.R2_BUCKET_NAME || 'foul-play-fm').replace(/^["']|["']$/g, '');
  const publicBaseUrl = (process.env.R2_PUBLIC_URL || '').replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const s3 = getS3Client();

  const emptyCatalog: RadioAssetCatalog = {
    adverts: [],
    sweepers: [],
    showSweepers: [],
    newsBeds: [],
    trafficAmbience: [],
    stingers: [],
    beds: [],
    sfx: [],
    lastFetched: now,
  };

  if (!s3 || !publicBaseUrl) {
    return emptyCatalog;
  }

  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
    const contents = res.Contents || [];

    const adverts: RadioAsset[] = [];
    const sweepers: RadioAsset[] = [];
    const showSweepers: RadioAsset[] = [];
    const newsBeds: RadioAsset[] = [];
    const trafficAmbience: RadioAsset[] = [];
    const stingers: RadioAsset[] = [];
    const beds: RadioAsset[] = [];
    const sfx: RadioAsset[] = [];

    for (const obj of contents) {
      const key = obj.Key;
      if (!key || key.endsWith('/') || (obj.Size || 0) === 0) continue;

      // Ensure proper URL encoding for keys with spaces/special characters
      const encodedKey = key.split('/').map(encodeURIComponent).join('/');
      const url = `${publicBaseUrl}/${encodedKey}`;
      const name = cleanNameFromKey(key);
      const size = obj.Size || 0;

      if (key.startsWith('adverts/')) {
        adverts.push({ key, name, url, size, category: 'advert' });
      } else if (key.startsWith('imaging/sweepers/shows/')) {
        showSweepers.push({ key, name, url, size, category: 'show-sweeper' });
      } else if (key.startsWith('imaging/sweepers/')) {
        sweepers.push({ key, name, url, size, category: 'sweeper' });
      } else if (key.startsWith('imaging/segments/news/beds/')) {
        newsBeds.push({ key, name, url, size, category: 'bed' });
      } else if (key.startsWith('imaging/segments/traffic/')) {
        trafficAmbience.push({ key, name, url, size, category: 'sfx' });
      } else if (key.startsWith('imaging/stingers/')) {
        stingers.push({ key, name, url, size, category: 'stinger' });
      } else if (key.startsWith('imaging/beds/')) {
        beds.push({ key, name, url, size, category: 'bed' });
      } else if (key.startsWith('imaging/sfx/')) {
        sfx.push({ key, name, url, size, category: 'sfx' });
      }
    }

    cachedCatalog = {
      adverts,
      sweepers,
      showSweepers,
      newsBeds,
      trafficAmbience,
      stingers,
      beds,
      sfx,
      lastFetched: now,
    };

    return cachedCatalog;
  } catch (err) {
    console.error('Failed to list R2 assets:', err);
    return cachedCatalog || emptyCatalog;
  }
}

/**
 * Pick a random advert from the catalog.
 */
export async function getRandomAdvert(): Promise<RadioAsset | null> {
  const catalog = await getR2AssetCatalog();
  if (catalog.adverts.length === 0) return null;
  const idx = Math.floor(Math.random() * catalog.adverts.length);
  return catalog.adverts[idx];
}

/**
 * Pick a random sweeper / station ID from the catalog.
 */
export async function getRandomSweeper(): Promise<RadioAsset | null> {
  const catalog = await getR2AssetCatalog();
  if (catalog.sweepers.length === 0) return null;
  const idx = Math.floor(Math.random() * catalog.sweepers.length);
  return catalog.sweepers[idx];
}

/**
 * Find a show-specific sweeper from R2 (e.g., truckers_tales_intro for truckers-tales-tacky-talk).
 */
export async function getShowSweeper(showId: string): Promise<RadioAsset | null> {
  const catalog = await getR2AssetCatalog();
  if (catalog.showSweepers.length === 0) return null;

  const normalizedShowId = showId.toLowerCase().replace(/[-_]/g, '');
  
  // Find matching show sweeper by key or name comparison
  const matched = catalog.showSweepers.find((s) => {
    const normalizedKey = s.key.toLowerCase().replace(/[-_]/g, '');
    const filename = s.key.split('/').pop()?.toLowerCase() || '';
    
    // Check direct substring matches
    if (normalizedKey.includes(normalizedShowId)) return true;
    if (filename.includes('trucker') && showId.includes('trucker')) return true;
    if (filename.includes('tin_foil') && showId.includes('tin-foil')) return true;
    if (filename.includes('morning') && showId.includes('morning')) return true;
    if (filename.includes('wacky') && showId.includes('wacky')) return true;
    if (filename.includes('midday') && showId.includes('midday')) return true;
    if (filename.includes('rush_hour') && showId.includes('rush-hour')) return true;
    if (filename.includes('funky') && showId.includes('funky')) return true;
    if (filename.includes('after_dark') && showId.includes('after-dark')) return true;
    if (filename.includes('graveyard') && showId.includes('graveyard')) return true;

    return false;
  });

  return matched || null;
}

/**
 * Retrieve the active news bed audio track.
 */
export async function getNewsBed(): Promise<RadioAsset | null> {
  const catalog = await getR2AssetCatalog();
  return catalog.newsBeds[0] || null;
}

/**
 * Retrieve the active traffic helicopter ambience audio track.
 */
export async function getTrafficAmbience(): Promise<RadioAsset | null> {
  const catalog = await getR2AssetCatalog();
  return catalog.trafficAmbience[0] || null;
}
