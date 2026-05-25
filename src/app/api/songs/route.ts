import { NextRequest, NextResponse } from 'next/server';
import { searchItunes } from '@/lib/itunes';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const tracks = await searchItunes(q, 10);
  return NextResponse.json(tracks);
}
