import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export interface RadioAsset {
  key: string;
  name: string;
  url: string;
  size: number;
  category: 'advert' | 'sweeper' | 'stinger' | 'bed' | 'sfx';
}

export interface RadioAssetCatalog {
  adverts: RadioAsset[];
  sweepers: RadioAsset[];
  stingers: RadioAsset[];
  beds: RadioAsset[];
  sfx: RadioAsset[];
  lastFetched: number;
}

// In-memory cache for 60 seconds
let cachedCatalog: RadioAssetCatalog | null = null;
const CACHE_TTL_MS = 60 * 1000;

function getS3Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

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

  const bucketName = process.env.R2_BUCKET_NAME || 'foul-play-fm';
  const publicBaseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  const s3 = getS3Client();

  const emptyCatalog: RadioAssetCatalog = {
    adverts: [],
    sweepers: [],
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
      } else if (key.startsWith('imaging/sweepers/')) {
        sweepers.push({ key, name, url, size, category: 'sweeper' });
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
