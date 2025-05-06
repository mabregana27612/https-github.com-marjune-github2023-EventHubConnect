import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { User, Event as EventType, Topic } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2, Calendar, MapPin, Clock, Users, Award, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AttendanceTracker } from "@/components/events/attendance-tracker";

type EventWithDetails = EventType & {
  topics: (Topic & {
    speakers: User[];
  })[];
  registrations: {
    id: number;
    user: User;
    attended: boolean;
    certificateGenerated: boolean;
  }[];
  registrationCount: number;
  registrationPercentage: number;
  isRegistered: boolean;
  hasAttended: boolean;
  hasCertificate: boolean;
  certificateUrl?: string;
};

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const { data: event, isLoading } = useQuery<EventWithDetails>({
    queryKey: [`/api/events/${id}`],
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/events/${id}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "Registration successful",
        description: "You have successfully registered for this event.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/events/${id}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "Registration cancelled",
        description: "Your registration has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/events/${id}/attendance/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "Attendance marked",
        description: "Attendance has been successfully marked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateCertificateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${id}/certificate`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "Certificate generated",
        description: "Your certificate has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Certificate generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegistration = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to register for this event.",
        variant: "destructive",
      });
      return;
    }
    
    if (event) {
      // Display warning for past events but still allow registration (for testing)
      if (new Date(event.eventDate) <= new Date()) {
        toast({
          title: "Past Event Warning",
          description: "This event has already occurred, but registration will still be attempted.",
          variant: "warning",
        });
      }
      
      // Display warning for events at capacity but still allow registration (server will validate)
      if (event.registrationCount >= event.capacity && !event.isRegistered) {
        toast({
          title: "Event Capacity Warning",
          description: "This event appears to be at capacity, but registration will still be attempted.",
          variant: "warning",
        });
      }
      
      if (event.isRegistered) {
        cancelRegistrationMutation.mutate();
      } else {
        registerMutation.mutate();
      }
    }
  };

  const handleMarkAttendance = (userId: number) => {
    markAttendanceMutation.mutate(userId);
  };

  const handleGenerateCertificate = () => {
    generateCertificateMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const isAdmin = user?.role === 'admin';
  const isSpeaker = user?.role === 'speaker';
  const isRegularUser = user?.role === 'user';
  
  // Allow any authenticated user to register (including admin/speakers for testing)
  // We'll only check if user is authenticated and the event exists - let the server handle date/capacity validation
  const canRegister = !!user && !!event;
  
  console.log("User status:", { 
    isAuthenticated: !!user, 
    role: user?.role, 
    eventDate: event?.eventDate,
    isPastEvent: event ? new Date(event.eventDate) <= new Date() : null,
    capacity: event?.capacity,
    registrationCount: event?.registrationCount,
    canRegister
  });
  
  const canGenerateCertificate = isRegularUser && event?.hasAttended && !event?.hasCertificate;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user as User} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileNav user={user as User} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/events')}
                className="mb-4"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to events
              </Button>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : event ? (
                <div>
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                    <div className="px-4 py-5 sm:px-6 flex justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                          {event.description}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          event.status === 'published' ? 'default' : 
                          event.status === 'draft' ? 'secondary' : 
                          event.status === 'cancelled' ? 'destructive' : 
                          'outline'
                        }
                        className="ml-4"
                      >
                        {event.status && (event.status.charAt(0).toUpperCase() + event.status.slice(1))}
                      </Badge>
                    </div>
                    <div className="border-t border-gray-200">
                      <dl>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            Date
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {formatDate(event.eventDate)}
                          </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            Time
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {event.startTime && event.startTime.slice(0, 5)} - {event.endTime && event.endTime.slice(0, 5)}
                          </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <MapPin className="mr-2 h-4 w-4" />
                            Location
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {event.venue}
                            <span className="ml-2 text-xs text-gray-500">({event.locationType})</span>
                          </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            Registration
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="flex flex-col">
                              <span>{event.registrationCount} of {event.capacity} spots filled</span>
                              <Progress value={event.registrationPercentage} className="h-2 mt-2" />
                            </div>
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    {canRegister && (
                      <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
                        <Button 
                          onClick={handleRegistration}
                          disabled={registerMutation.isPending || cancelRegistrationMutation.isPending}
                          variant={event.isRegistered ? "destructive" : "default"}
                        >
                          {event.isRegistered ? (
                            registerMutation.isPending ? "Cancelling..." : "Cancel Registration"
                          ) : (
                            cancelRegistrationMutation.isPending ? "Registering..." : "Register for Event"
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {event.isRegistered && event.hasAttended && (
                      <div className="px-4 py-3 bg-gray-50 sm:px-6 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Award className="mr-2 h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {event.hasCertificate ? "Certificate Available" : "You've attended this event"}
                            </span>
                          </div>
                          
                          {event.hasCertificate ? (
                            <a 
                              href={event.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              Download Certificate
                            </a>
                          ) : canGenerateCertificate ? (
                            <Button 
                              onClick={handleGenerateCertificate}
                              disabled={generateCertificateMutation.isPending}
                            >
                              {generateCertificateMutation.isPending ? "Generating..." : "Generate Certificate"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Tabs defaultValue="topics" className="mt-6">
                    <TabsList>
                      <TabsTrigger value="topics">Topics & Speakers</TabsTrigger>
                      {isAdmin && <TabsTrigger value="attendees">Attendees</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="topics">
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {event.topics.map(topic => (
                          <Card key={topic.id}>
                            <CardHeader>
                              <CardTitle>{topic.title}</CardTitle>
                              {topic.description && (
                                <CardDescription>{topic.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <h4 className="font-medium text-sm text-gray-500 mb-2">Speakers:</h4>
                              {topic.speakers.length > 0 ? (
                                <div className="space-y-3">
                                  {topic.speakers.map(speaker => (
                                    <div key={speaker.id} className="flex items-center space-x-3">
                                      <Avatar>
                                        <AvatarImage src={speaker.profileImage || undefined} />
                                        <AvatarFallback>{speaker.name && speaker.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium leading-none">{speaker.name}</p>
                                        <p className="text-sm text-muted-foreground">@{speaker.username}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No speakers assigned</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    
                    {isAdmin && (
                      <TabsContent value="attendees">
                        <Card>
                          <CardHeader>
                            <CardTitle>Registered Attendees</CardTitle>
                            <CardDescription>
                              Total registrations: {event.registrations.length}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {event.registrations.length > 0 ? (
                              <div className="border rounded-md">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendee</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                                      <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {event.registrations.map(registration => (
                                      <tr key={registration.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <Avatar className="mr-3">
                                              <AvatarImage src={registration.user.profileImage || undefined} />
                                              <AvatarFallback>{registration.user.name && registration.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <div className="text-sm font-medium text-gray-900">{registration.user.name}</div>
                                              <div className="text-sm text-gray-500">@{registration.user.username}</div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <Badge 
                                            variant={registration.attended ? "default" : "outline"}
                                          >
                                            {registration.attended ? "Attended" : "Not Attended"}
                                          </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <Badge 
                                            variant={registration.certificateGenerated ? "secondary" : "outline"}
                                          >
                                            {registration.certificateGenerated ? "Generated" : "Not Generated"}
                                          </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          {!registration.attended && (
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => handleMarkAttendance(registration.user.id)}
                                              disabled={markAttendanceMutation.isPending}
                                            >
                                              Mark Attendance
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-center py-4 text-gray-500">No registrations yet</p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900">Event not found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    The event you're looking for doesn't exist or you don't have permission to view it.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setLocation('/events')}
                  >
                    Go back to events
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
