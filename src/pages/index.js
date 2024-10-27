import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  LockKeyhole,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Users,
  LogOut
} from 'lucide-react';
import EventCreationForm from '@/components/EventCreationForm';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isDjView, setIsDjView] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    checkUser();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (activeEvent) {
      fetchRequests(activeEvent.id);
    }
  }, [activeEvent]);

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
      let query = supabase.from('events').select('*').order('date', { ascending: true });
      
      // If in DJ view and logged in, only fetch their events
      if (isDjView && user) {
        query = query.eq('dj_id', user.id);
      }
      
      const { data, error } = await query;
      
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
      fetchEvents();
    } catch (error) {
      console.error('Error logging in:', error.message);
      setMessage(error.message);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setIsLoggedIn(false);
      setMessage('Logged out successfully');
      fetchEvents();
    } catch (error) {
      console.error('Error logging out:', error.message);
      setMessage('Error logging out');
    }
  }

  async function handleEventSubmit(formData) {
    setEventLoading(true);
    setMessage('');

    try {
      if (!user) {
        throw new Error('You must be logged in to create events');
      }

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            name: formData.name,
            date: new Date(formData.date).toISOString(),
            description: formData.description || '',
            dj_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      if (data) {
        setEvents(prevEvents => [...prevEvents, data[0]]);
        setMessage('Event created successfully!');
        router.push(`/event/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.message || 'Error creating event');
    } finally {
      setEventLoading(false);
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

  const stats = {
    totalRequests: requests.length,
    completedRequests: requests.filter(r => r.status === 'completed').length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    totalTips: requests.reduce((sum, r) => sum + (parseFloat(r.tip_amount) || 0), 0)
  };

const DjDashboard = () => (
  <div className="space-y-6">
    <EventCreationForm onSubmit={handleEventSubmit} isLoading={eventLoading} />

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

    {/* Request Management */}
    {activeEvent && (
      <Card id="requestManagement">
        <CardHeader>
          <CardTitle>Request Management - {activeEvent.name}</CardTitle>
          <CardDescription>Manage song requests for this event</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    )}

    {/* Events List - Now below Request Management */}
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Your Events</CardTitle>
        <CardDescription>Select an event to manage requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <select
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onChange={(e) => {
              if (e.target.value) {
                const selectedEvent = events.find(event => event.id.toString() === e.target.value);
                setActiveEvent(selectedEvent);
              }
            }}
            value={activeEvent?.id || "default"}
          >
            <option value="default" disabled>Select an Event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>

          {activeEvent && (
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{activeEvent.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(activeEvent.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/event/${activeEvent.id}`)}
                  >
                    View Event Page
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">DJ Event Management System</h1>
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
                  )}
                </div>
              ) : (
                <DjDashboard />
              )}
            </CardContent>
          </Card>
        ) : (
          // Public View - List of Events
          <Card className="border-t-4 border-t-purple-600">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Select an event to make a song request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.length > 0 ? (
                  events.map((event) => (
                    <Card key={event.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{event.name}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>
                        <Button 
                          onClick={() => router.push(`/event/${event.id}`)}
                        >
                          Make Request
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No upcoming events</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}



