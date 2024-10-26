
import React from 'react';
  // Add this with other lucide imports
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  LockKeyhole,
  Send,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Users,
  BarChart,
  LogOut
} from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);



export default function Home() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
  email: '',
  password: '',
  confirmPassword: ''});
  // Replace your newEvent state with these individual states
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [isDjView, setIsDjView] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeEvent, setActiveEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newRequest, setNewRequest] = useState({
    songName: '',
    artist: '',
    specialRequest: '',
    tipAmount: 0
  });
  // Add this with your other useState declarations
  const [message, setMessage] = useState('');

  // Check for existing session on load
  useEffect(() => {
    checkUser();
    fetchEvents();
  }, []);

  // Fetch requests when active event changes
  useEffect(() => {
    if (activeEvent) {
      fetchRequests(activeEvent.id);
    }
  }, [activeEvent]);

  //new user function addddddddddddddddd
const handleRegister = async (e) => {
  e.preventDefault();
  
  if (registerData.password !== registerData.confirmPassword) {
    setMessage('Passwords do not match');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password
    });

    if (error) throw error;

    setMessage('Registration successful! Please check your email for verification.');
    setIsRegistering(false);
  } catch (error) {
    setMessage(error.message);
  }
};

  //end
  

  async function checkUser() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session?.user);
    } catch (error) {
      console.error('Error checking user:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      setEvents(data || []);
      if (data?.length > 0 && !activeEvent) {
        setActiveEvent(data[0]);
      }
    } catch (error) {
      console.error('Error fetching events:', error.message);
      setMessage('Error loading events');
    }
  }

  async function fetchRequests(eventId) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error.message);
      setMessage('Error loading requests');
    }
  }

  async function handleDjLogin(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setUser(data.user);
      setIsLoggedIn(true);
      setMessage('Successfully logged in!');
    } catch (error) {
      console.error('Error logging in:', error.message);
      setMessage(error.message);
    }
  }

  // Replace or add this function near your other handler functions
async function handleCreateEvent(e) {
  e.preventDefault();
  setEventLoading(true);
  setMessage('');

  // Validation
  if (!newEvent.name || !newEvent.date) {
    setMessage('Event name and date are required');
    setEventLoading(false);
    return;
  }

  try {
    // Make sure we have a logged-in user
    if (!user) {
      throw new Error('You must be logged in to create events');
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          name: newEvent.name,
          date: new Date(newEvent.date).toISOString(),
          description: newEvent.description || '',
          dj_id: user.id
        }
      ])
      .select();

    if (error) throw error;

    if (data) {
      setEvents(prevEvents => [...prevEvents, data[0]]);
      setNewEvent({ name: '', date: '', description: '' });
      setMessage('Event created successfully!');
    }
  } catch (error) {
    console.error('Detailed error:', error);
    setMessage(error.message || 'Error creating event');
  } finally {
    setEventLoading(false);
  }
}
  

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setIsLoggedIn(false);
      setMessage('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error.message);
      setMessage('Error logging out');
    }
  }

  async function handleNewRequest(e) {
    e.preventDefault();
    if (!activeEvent) {
      setMessage('No active event selected');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([{
          event_id: activeEvent.id,
          song_name: newRequest.songName,
          artist: newRequest.artist,
          special_request: newRequest.specialRequest,
          tip_amount: parseFloat(newRequest.tipAmount) || 0,
          status: 'pending'
        }])
        .select();

      if (error) throw error;
      
      setRequests([...requests, data[0]]);
      setNewRequest({ songName: '', artist: '', specialRequest: '', tipAmount: 0 });
      setMessage('Request submitted successfully!');
    } catch (error) {
      console.error('Error submitting request:', error.message);
      setMessage('Error submitting request');
    }
  }

  async function updateRequestStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .update({ status })
        .eq('id', id)
        .select();

      if (error) throw error;
      setRequests(requests.map(request => 
        request.id === id ? { ...request, status } : request
      ));
    } catch (error) {
      console.error('Error updating request:', error.message);
      setMessage('Error updating request status');
    }
  }

  // Calculate statistics
  const stats = {
    totalRequests: requests.length,
    completedRequests: requests.filter(r => r.status === 'completed').length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    totalTips: requests.reduce((sum, r) => sum + (parseFloat(r.tip_amount) || 0), 0)
  };

  const DjDashboard = () => (
    <div className="space-y-6">
      {/* Add this Card component at the top of DjDashboard */}
{/* After your header section, update or add this Alert component */}
{message && (
  <Alert className="mb-4" variant={message.includes('Error') ? 'destructive' : 'default'}>
    <AlertDescription>
      {message}
    </AlertDescription>
  </Alert>
)}
<Card>
  <CardHeader>
    <CardTitle>Create New Event</CardTitle>
    <CardDescription>Set up a new event for song requests</CardDescription>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleCreateEvent} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eventName">Event Name</Label>
        <Input
          id="eventName"
          type="text"
          value={newEvent.name}
          onInput={(e) => {
            setNewEvent({
              ...newEvent,
              name: e.target.value
            });
          }}
          placeholder="Enter event name"
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDate">Event Date</Label>
        <Input
          id="eventDate"
          type="datetime-local"
          value={newEvent.date}
          onInput={(e) => {
            setNewEvent({
              ...newEvent,
              date: e.target.value
            });
          }}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDescription">Description (Optional)</Label>
        <Textarea
          id="eventDescription"
          value={newEvent.description}
          onInput={(e) => {
            setNewEvent({
              ...newEvent,
              description: e.target.value
            });
          }}
          placeholder="Add event details"
          className="min-h-[100px] w-full"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={eventLoading}
      >
        {eventLoading ? 'Creating Event...' : 'Create Event'}
      </Button>
    </form>
  </CardContent>
</Card>

      {/* Event Selection and Header */}
      <div className="flex justify-between items-center">
        <Select 
          value={activeEvent?.id?.toString()} 
          onValueChange={(value) => setActiveEvent(events.find(e => e.id.toString() === value))}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select Event" />
          </SelectTrigger>
          <SelectContent>
            {events.map(event => (
              <SelectItem key={event.id} value={event.id.toString()}>
                {event.name} - {new Date(event.date).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats.totalRequests, icon: Users },
          { label: "Pending", value: stats.pendingRequests, icon: Clock },
          { label: "Completed", value: stats.completedRequests, icon: CheckCircle2 },
          { label: "Total Tips", value: `$${stats.totalTips.toFixed(2)}`, icon: DollarSign }
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className="h-8 w-8 text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Management Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="playing">Now Playing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {['pending', 'playing', 'completed', 'rejected'].map(status => (
          <TabsContent key={status} value={status}>
            <div className="space-y-4">
              {requests.filter(r => r.status === status).map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{request.song_name}</h4>
                        <p className="text-sm text-gray-600">{request.artist}</p>
                        {request.special_request && (
                          <p className="text-sm text-gray-500">Note: {request.special_request}</p>
                        )}
                        {request.tip_amount > 0 && (
                          <Badge variant="secondary">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Tip: ${parseFloat(request.tip_amount).toFixed(2)}
                          </Badge>
                        )}
                        <div className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateRequestStatus(request.id, 'playing')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Play
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateRequestStatus(request.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {status === 'playing' && (
                          <Button
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'completed')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {requests.filter(r => r.status === status).length === 0 && (
                <p className="text-center text-gray-500 py-4">No {status} requests</p>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DJ Event Management System</h1>
            {activeEvent && (
              <p className="text-gray-600">
                {activeEvent.name} - {new Date(activeEvent.date).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button 
            onClick={() => setIsDjView(!isDjView)}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isDjView ? <Music className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
            Switch to {isDjView ? 'Request' : 'DJ'} View
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {isDjView ? (
          <Card className="border-t-4 border-t-blue-600">
            <CardHeader>
              <CardTitle>DJ Dashboard</CardTitle>
              <CardDescription>Manage song requests and event details</CardDescription>
            </CardHeader>
            <CardContent>
              {!isLoggedIn ? (
  <div className="space-y-4 max-w-md mx-auto">
    {!isRegistering ? (
      // Login Form
      <>
        <form onSubmit={handleDjLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <Button type="submit" className="w-full">Login</Button>
        </form>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full"
          onClick={() => setIsRegistering(true)}
        >
          Create New DJ Account
        </Button>
      </>
    ) : (
      // Registration Form
      <>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="registerEmail">Email</Label>
            <Input
              id="registerEmail"
              type="email"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <Label htmlFor="registerPassword">Password</Label>
            <Input
              id="registerPassword"
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={registerData.confirmPassword}
              onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              required
            />
          </div>
          <Button type="submit" className="w-full">Register</Button>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => setIsRegistering(false)}
          >
            Back to Login
          </Button>
        </form>
      </>
    )}
  </div>
              ) : (
                <DjDashboard />
              )}
            </CardContent>
          </Card>
        ) : (
       <Card className="border-t-4 border-t-purple-600">
            <CardHeader>
              <CardTitle>Request a Song</CardTitle>
              <CardDescription>Select an event and submit your request</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <form onSubmit={handleNewRequest} className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label htmlFor="eventSelect">Select Event</Label>
                    <Select 
                      value={activeEvent?.id?.toString()} 
                      onValueChange={(value) => setActiveEvent(events.find(e => e.id.toString() === value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map(event => (
                          <SelectItem 
                            key={event.id} 
                            value={event.id.toString()}
                            disabled={new Date(event.date) < new Date()}
                          >
                            {event.name} - {new Date(event.date).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activeEvent ? (
                    <>
                      <div>
                        <Label htmlFor="songName">Song Name</Label>
                        <Input
                          id="songName"
                          value={newRequest.songName}
                          onChange={(e) => setNewRequest({...newRequest, songName: e.target.value})}
                          placeholder="Enter song name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="artist">Artist</Label>
                        <Input
                          id="artist"
                          value={newRequest.artist}
                          onChange={(e) => setNewRequest({...newRequest, artist: e.target.value})}
                          placeholder="Enter artist name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialRequest">Special Request (Optional)</Label>
                        <Textarea
                          id="specialRequest"
                          value={newRequest.specialRequest}
                          onChange={(e) => setNewRequest({...newRequest, specialRequest: e.target.value})}
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
                            value={newRequest.tipAmount}
                            onChange={(e) => setNewRequest({...newRequest, tipAmount: e.target.value})}
                            className="pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" />
                        Submit Request
                      </Button>
                    </>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Please select an event to make a request
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              ) : (
                <Alert>
                  <AlertDescription>
                    No active events available for requests
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
