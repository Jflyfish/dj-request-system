import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Music, LockKeyhole, LogOut } from 'lucide-react';
import EventCreationForm from '@/components/EventCreationForm';
import { useRouter } from 'next/router';

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

  // Check for existing session on load
  useEffect(() => {
    checkUser();
    fetchEvents();
  }, []);

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
    } catch (error) {
      console.error('Error fetching events:', error.message);
      setMessage('Error loading events');
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
      // Fetch DJ-specific events after login
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
      // Reset to all events view
      fetchEvents();
    } catch (error) {
      console.error('Error logging out:', error.message);
      setMessage('Error logging out');
    }
  }

  // New function to handle event creation
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
        // Navigate to the new event page
        router.push(`/event/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.message || 'Error creating event');
    } finally {
      setEventLoading(false);
    }
  }

  const DjDashboard = () => (
    <div className="space-y-6">
      {message && (
        <Alert className="mb-4" variant={message.includes('Error') ? 'destructive' : 'default'}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      
      <EventCreationForm onSubmit={handleEventSubmit} isLoading={eventLoading} />

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
          <CardDescription>Manage your upcoming events</CardDescription>
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
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => router.push(`/event/${event.id}`)}
                    >
                      View Event Page
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-500">No events created yet</p>
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
