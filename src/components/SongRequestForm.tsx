import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Send } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SongRequestFormProps {
  eventId: string;
}

const SongRequestForm: React.FC<SongRequestFormProps> = ({ eventId }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState({
    songName: '',
    artist: '',
    specialRequest: '',
    tipAmount: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([{
          event_id: eventId,
          song_name: request.songName,
          artist: request.artist,
          special_request: request.specialRequest,
          tip_amount: parseFloat(request.tipAmount.toString()) || 0,
          status: 'pending'
        }])
        .select();

      if (error) throw error;
      
      setRequest({
        songName: '',
        artist: '',
        specialRequest: '',
        tipAmount: 0
      });
      setMessage('Request submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting request:', error.message);
      setMessage('Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8">
      <Card>
        <CardContent className="pt-6">
          {message && (
            <Alert className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="songName">Song Name</Label>
              <Input
                id="songName"
                value={request.songName}
                onChange={(e) => setRequest({...request, songName: e.target.value})}
                placeholder="Enter song name"
                required
              />
            </div>

            <div>
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                value={request.artist}
                onChange={(e) => setRequest({...request, artist: e.target.value})}
                placeholder="Enter artist name"
                required
              />
            </div>

            <div>
              <Label htmlFor="specialRequest">Special Request (Optional)</Label>
              <Textarea
                id="specialRequest"
                value={request.specialRequest}
                onChange={(e) => setRequest({...request, specialRequest: e.target.value})}
                placeholder="Any special requests or dedications?"
                className="h-24"
              />
            </div>

            <div>
              <Label htmlFor="tipAmount">Tip Amount (Optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="tipAmount"
                  type="number"
                  min="0"
                  step="1"
                  value={request.tipAmount}
                  onChange={(e) => setRequest({...request, tipAmount: Number(e.target.value)})}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SongRequestForm;
