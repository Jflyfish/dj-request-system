import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SongRequestForm from '@/components/SongRequestForm';

// Initialize Supabase client (move this to a shared utils file)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            profiles:dj_id (
              username,
              full_name
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (err) {
        setError('Event not found');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{event?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Event Date</h3>
                <p>{new Date(event?.date).toLocaleString()}</p>
              </div>
              {event?.description && (
                <div>
                  <h3 className="font-semibold">Description</h3>
                  <p>{event.description}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold">DJ</h3>
                <p>{event?.profiles?.full_name || event?.profiles?.username}</p>
              </div>
              
              {/* Add your song request form here */}
              {/* Add your song request form here */}
<SongRequestForm eventId={event.id} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
