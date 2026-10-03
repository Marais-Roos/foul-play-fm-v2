import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'caller',
  title: 'Caller Persona',
  type: 'document',
  fields: [
    defineField({
      name: 'voiceTag',
      title: 'Voice Tag',
      description: 'e.g. THE_ZEF, THE_UNCLE, THE_TANNIE, THE_SIMP',
      type: 'string',
    }),
    defineField({
      name: 'archetype',
      title: 'Archetype Title',
      description: 'e.g. The Corporate Simp, The "Boet", The Neighbourhood Watch',
      type: 'string',
    }),
    defineField({
      name: 'targetOfSatire',
      title: 'Target of Satire',
      type: 'string',
    }),
    defineField({
      name: 'contextStrategy',
      title: 'AI Usage Strategy',
      description: 'Strategy for Gemini to guide this caller in an on-air argument.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'voicePrompt',
      title: 'AI Personality Prompt / Script Instructions',
      description: 'Tone, catchphrases, and delivery instructions.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'sampleQuote',
      title: 'Sample Caller Quote',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    select: {
      title: 'archetype',
      subtitle: 'targetOfSatire',
    },
  },
});
