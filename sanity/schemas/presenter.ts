import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'presenter',
  title: 'Presenter',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'image',
      title: 'Profile Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'bio',
      title: 'Biography (Public)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'voicePrompt',
      title: 'AI Personality Prompt',
      description: 'Instructions for the AI (e.g., "Aggressive, rude, uses slang")',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'voiceSample',
      title: 'Voice Sample',
      description: 'Upload the reference audio for voice cloning here.',
      type: 'file',
      options: {
        accept: 'audio/mpeg,audio/wav',
      },
    }),
    defineField({
      name: 'parodyOf',
      title: 'Parody Of (Archetype)',
      description: 'Reference character or real-life inspiration (e.g. John Cena, Paris Hilton, Alex Jones)',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'image',
    },
  },
});
