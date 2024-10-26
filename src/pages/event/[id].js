import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  const [newRequest, setNewRequest] = useState({
    songName: '',
    artist: '',
    specialRequest: '',
    tipAmount: 0
  });
  const [requestStatus, setRequestStatus] = useState('');

  // Fetch event and requests when id is available
  useEffect(() => {
    console.log("ID from router:", id);
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  // Function to fetch event details
  const fetchEventDetails = async () => {
    try {
      // First, fetch the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      console.log("Event data:", eventData);
      console.log("Event error:", eventError);

      if (eventError) throw eventError;

      setEvent(eventData);

      // Then fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(requestsData || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle new request submission
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setRequestStatus('');

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([
          {
            event_id: id,
            song_name: newRequest.songName,
            artist: newRequest.artist,
            special_request: newRequest.specialRequest,
            tip_amount: parseFloat(newRequest.tipAmount) || 0,
            status: 'pending'
          }
        ])
        .select();

      if (error) throw error;

      setRequests([data[0], ...requests]);
      setNewRequest({ songName: '', artist: '', specialRequest: '', tipAmount: 0 });
      setRequestStatus('Request submitted successfully!');
      
      // Refresh requests
      fetchEventDetails();
    } catch (error) {
      console.error('Error submitting request:', error);
      setRequestStatus('Error submitting request: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto text-center">
          Loading event details...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              {error || 'Event not found'}
            </AlertDescription>
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
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>

        {/* Event Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{event.name}</CardTitle>
            <CardDescription>
              Event Date: {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.description && (
              <div className="mb-4">
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
          </CardContent>
        </Card>

        {/* Request Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Make a Song Request</CardTitle>
            <CardDescription>
              Submit your song request for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestStatus && (
              <Alert className="mb-4">
                <AlertDescription>{requestStatus}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Song Name
                </label>
                <input
                  type="text"
                  value={newRequest.songName}
                  onChange={(e) => setNewRequest({...newRequest, songName: e.target.value})}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Artist
                </label>
                <input
                  type="text"
                  value={newRequest.artist}
                  onChange={(e) => setNewRequest({...newRequest, artist: e.target.value})}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Special Request (Optional)
                </label>
                <textarea
                  value={newRequest.specialRequest}
                  onChange={(e) => setNewRequest({...newRequest, specialRequest: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tip Amount (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newRequest.tipAmount}
                  onChange={(e) => setNewRequest({...newRequest, tipAmount: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
