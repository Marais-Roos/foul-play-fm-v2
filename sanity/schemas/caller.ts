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
    defineField({
      name: 'gender',
      title: 'Gender Identity',
      description: 'Used for switchboard caller name selection and on-air host pronouns.',
      type: 'string',
      options: {
        list: [
          { title: 'Male', value: 'male' },
          { title: 'Female', value: 'female' },
          { title: 'Neutral / Androgynous', value: 'neutral' },
        ],
        layout: 'radio',
      },
      initialValue: 'male',
    }),
    defineField({
      name: 'callerNames',
      title: 'Caller Names Pool (Optional)',
      description: 'Comma-separated list of first names for this caller (e.g. "Brenda, Cheryl, Karen, Marinda"). Overrides built-in defaults.',
      type: 'string',
    }),
    defineField({
      name: 'fishAudioVoiceId',
      title: 'Fish Audio Voice ID',
      description: 'Cloned voice model ID from Fish Audio.',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'archetype',
      subtitle: 'voiceTag',
    },
  },
});
