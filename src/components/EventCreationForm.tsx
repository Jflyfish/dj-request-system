import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface EventFormData {
  name: string;
  date: string;
  description: string;
}

interface EventCreationFormProps {
  onSubmit: (data: EventFormData) => Promise<void>;
  isLoading: boolean;
}

const EventCreationForm: React.FC<EventCreationFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    date: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    if (!isLoading) {
      setFormData({
        name: '',
        date: '',
        description: ''
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id.replace('event', '').toLowerCase()]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
        <CardDescription>Set up a new event for song requests</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Event Date</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDescription">Description (Optional)</Label>
            <Textarea
              id="eventDescription"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add event details"
              className="min-h-[100px]"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EventCreationForm;
