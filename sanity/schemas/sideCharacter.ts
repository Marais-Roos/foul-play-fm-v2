import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'sideCharacter',
  title: 'Side Character',
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
      name: 'role',
      title: 'Station Role',
      description: 'e.g. Traffic Desk Anchor, Sports Pundit, Investigative Journalist, Ward Councillor',
      type: 'string',
    }),
    defineField({
      name: 'parodyOf',
      title: 'Parody Of (Archetype)',
      description: 'Reference character or real-life inspiration (e.g. Tom Cruise, Roy Keane, Tucker Carlson)',
      type: 'string',
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
      title: 'Biography',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'voicePrompt',
      title: 'AI Personality Prompt',
      description: 'Instructions for AI dialogue generation and delivery tone.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'fishAudioVoiceId',
      title: 'Fish Audio Voice ID',
      description: 'Cloned voice model ID from Fish Audio.',
      type: 'string',
    }),
    defineField({
      name: 'voiceSample',
      title: 'Voice Sample',
      description: 'Reference audio file for voice cloning.',
      type: 'file',
      options: {
        accept: 'audio/mpeg,audio/wav',
      },
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
});
