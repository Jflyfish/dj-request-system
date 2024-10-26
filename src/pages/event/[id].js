import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import SongRequestForm from '@/components/SongRequestForm';
import { ArrowLeft } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (id) {
      fetchEvent();
      fetchRequests();
    }
  }, [id]);

  async function fetchEvent() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:dj_id (
            email,
            id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Event not found');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">Loading event details...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertDescription>Event not found</AlertDescription>
          </Alert>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{event.name}</CardTitle>
            <CardDescription>
              Event Date: {new Date(event.date).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {event.description && (
                <div>
                  <h3 className="font-semibold">Description</h3>
                  <p className="text-gray-600">{event.description}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold">Event Details</h3>
                <p className="text-gray-600">
                  Total Requests: {requests.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Make a Song Request</CardTitle>
            <CardDescription>
              Submit your song request for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SongRequestForm eventId={id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
