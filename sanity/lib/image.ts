import { createImageUrlBuilder } from '@sanity/image-url';
import type { Image } from 'sanity';
import { projectId, dataset } from './client';

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || 'placeholder',
  dataset: dataset || 'production',
});

export const urlForImage = (source: Image | any) => {
  if (!source || !source.asset) return null;
  return imageBuilder.image(source).auto('format').fit('max');
};
