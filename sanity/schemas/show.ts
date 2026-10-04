import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'show',
  title: 'Show',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Show Title',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'timeSlot',
      title: 'Start Hour (0-23)',
      description: 'The hour of the day this show airs (e.g., 6 for 6:00 AM)',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(23).integer(),
    }),
    defineField({
      name: 'hosts',
      title: 'Hosts',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'presenter' } }],
    }),
    defineField({
      name: 'sideCharacters',
      title: 'Side Characters (Guests / Correspondents)',
      description: 'Select side characters and recurring guests featured in this show.',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'sideCharacter' } }],
    }),
    defineField({
      name: 'callers',
      title: 'Allowed Caller Personas',
      description: 'Select caller archetypes permitted to call into this show.',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'caller' } }],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'vibe',
      title: 'Show Vibe/Topic',
      description: 'Context for the AI (e.g. "Conspiracy theories and aliens")',
      type: 'string',
    }),
    defineField({
      name: 'jellyfinPlaylistId',
      title: 'Jellyfin Playlist ID',
      description: 'The Jellyfin playlist ID for this show (from the playlist URL in Jellyfin).',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'timeSlot', // Will show the hour in the list
      media: 'coverImage',
    },
  },
});
