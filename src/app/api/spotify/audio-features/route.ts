import { NextRequest, NextResponse } from 'next/server';
import { getAudioFeatures } from '@/lib/spotify';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? '';
  const artist = searchParams.get('artist') ?? '';
  if (!title || !artist) return NextResponse.json({ bpm: null, musicalKey: null });

  const features = await getAudioFeatures(title, artist);
  return NextResponse.json(features ?? { bpm: null, musicalKey: null });
}
