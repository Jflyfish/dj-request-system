const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

export async function getAudioFeatures(
  title: string,
  artist: string
): Promise<{ bpm: number; musicalKey: string } | null> {
  try {
    const token = await getToken();

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(`track:${title} artist:${artist}`)}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    const trackId = searchData.tracks?.items?.[0]?.id;
    if (!trackId) return null;

    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const f = await featuresRes.json();
    if (!f || f.tempo == null || f.key == null) return null;

    return {
      bpm: Math.round(f.tempo),
      musicalKey: f.key >= 0 ? `${KEY_NAMES[f.key]} ${f.mode === 1 ? 'maj' : 'min'}` : 'Unknown',
    };
  } catch {
    return null;
  }
}
