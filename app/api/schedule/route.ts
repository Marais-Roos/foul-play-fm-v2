import { NextResponse } from 'next/server';
import { stationBible, getCurrentShow, getStationTime } from '@/lib/data/station';

export async function GET() {
  const now = new Date();
  const currentShow = getCurrentShow(now);

  // Calculate elapsed seconds in current 3-hour show window using South African station time
  const { hour: currentHour, minute: currentMinutes, second: currentSeconds } = getStationTime(now);

  // Show runs for 3 hours (10,800 seconds)
  const hourOffsetInShow = (currentHour - currentShow.timeSlot.startHour + 24) % 24;
  const elapsedSecondsInShow = hourOffsetInShow * 3600 + currentMinutes * 60 + currentSeconds;
  const totalShowSeconds = 3 * 3600; // 3 hours = 10,800s

  const recentlyPlayed = [
    {
      id: 'rec-1',
      title: 'just stand there',
      artist: 'Fred again.., SOAK',
      duration: '00:12',
      cover: '/images/tracks/track-1.png',
    },
    {
      id: 'rec-2',
      title: 'Stay Blessed',
      artist: 'Swimming Paul, Alecc Crisostomo, D38',
      duration: '00:16',
      cover: '/images/tracks/track-2.png',
    },
    {
      id: 'rec-3',
      title: 'Oak Island',
      artist: 'Zach Bryan',
      duration: '00:20',
      cover: '/images/tracks/track-3.png',
    },
    {
      id: 'rec-4',
      title: 'All The Small Things',
      artist: 'blink-182',
      duration: '00:27',
      cover: '/images/tracks/track-4.png',
    },
  ];

  const vibes = [
    { id: 'rock', label: 'Rock', icon: 'fist' },
    { id: 'conspiracy', label: 'Conspiracy', icon: 'bot' },
    { id: 'trucker', label: 'Trucker Tales', icon: 'truck' },
    { id: 'morning', label: 'Morning Talk', icon: 'sun' },
    { id: 'latenight', label: 'Late Night', icon: 'moon' },
    { id: 'erratic', label: 'Erratic', icon: 'zap' },
  ];

  return NextResponse.json({
    currentShow,
    currentHour,
    elapsedSecondsInShow,
    totalShowSeconds,
    shows: stationBible.shows,
    djs: stationBible.djs,
    recentlyPlayed,
    vibes,
  });
}
