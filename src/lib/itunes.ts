export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl?: string;
}

export async function searchItunes(query: string, limit = 10): Promise<ItunesTrack[]> {
  if (!query.trim()) return [];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results as ItunesTrack[];
  } catch {
    return [];
  }
}
