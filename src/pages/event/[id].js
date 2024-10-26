import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const EventPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRequest, setNewRequest] = useState({
    songName: '',
    artist: '',
    specialRequest: '',
    tipAmount: 0
  });
  const [requestStatus, setRequestStatus] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          profiles:dj_id (
            email
          )
        `)
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      setNewRequest({
        songName: '',
        artist: '',
        specialRequest: '',
        tipAmount: 0
      });
      setRequestStatus('Request submitted successfully! The DJ will review your request.');
    } catch (error) {
      console.error('Error submitting request:', error);
      setRequestStatus(`Error submitting request: ${error.message}`);
    }
  };

  const copyEventLink = () => {
    const eventUrl = window.location.href;
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>
                  Event Date: {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString()}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyEventLink}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {event.description && (
              <div className="mb-4">
                <h3 className="font-semibold">Description</h3>
                <p className="text-gray-600">{event.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Make a Song Request</CardTitle>
            <CardDescription>
              Submit your song request for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestStatus && (
              <Alert className={`mb-4 ${requestStatus.includes('Error') ? 'destructive' : ''}`}>
                <AlertDescription>{requestStatus}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="songName">Song Name</Label>
                <Input
                  id="songName"
                  placeholder="Enter the song name"
                  value={newRequest.songName}
                  onChange={(e) => setNewRequest({...newRequest, songName: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  placeholder="Enter the artist name"
                  value={newRequest.artist}
                  onChange={(e) => setNewRequest({...newRequest, artist: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequest">Special Request (Optional)</Label>
                <Textarea
                  id="specialRequest"
                  placeholder="Add any special notes or dedications..."
                  value={newRequest.specialRequest}
                  onChange={(e) => setNewRequest({...newRequest, specialRequest: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipAmount">Tip Amount (Optional)</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Badge variant="secondary" className="bg-gray-100 hover:bg-gray-100">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                    </Badge>
                  </div>
                  <Input
                    id="tipAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newRequest.tipAmount}
                    onChange={(e) => setNewRequest({...newRequest, tipAmount: e.target.value})}
                    className="pl-12"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add an optional tip to increase your request priority
                </p>
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
};

export default EventPage;
