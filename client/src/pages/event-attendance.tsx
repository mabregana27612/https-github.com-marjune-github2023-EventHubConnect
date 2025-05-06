import { useEffect, useState } from "react";
import { useParams, useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { User } from "@shared/schema";

export default function EventAttendance() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>('/events/:id/attend');
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendanceCode, setAttendanceCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<'success' | 'error' | 'initial'>('initial');
  
  // Get attendance code from URL query param if available
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setAttendanceCode(code);
    }
  }, []);

  // Get event details
  const { data: event, isLoading } = useQuery({
    queryKey: [`/api/events/${id}`],
  });

  // Self-attendance mutation (for virtual events)
  const markSelfAttendanceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/events/${id}/self-attendance`, { code: attendanceCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      setAttendanceStatus('success');
      toast({
        title: "Success!",
        description: "Your attendance has been recorded.",
      });
    },
    onError: (error: Error) => {
      setAttendanceStatus('error');
      toast({
        title: "Attendance verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleSubmitAttendance = () => {
    if (!attendanceCode.trim()) {
      toast({
        title: "Missing attendance code",
        description: "Please enter an attendance code to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    markSelfAttendanceMutation.mutate();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to record your attendance</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => setLocation(`/auth?redirect=/events/${id}/attend`)}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
                onClick={() => setLocation(`/events/${id}`)}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to event
              </Button>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : event ? (
                <div className="max-w-md mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Attendance</CardTitle>
                      <CardDescription>
                        Record your attendance for "{event.title}"
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {event.locationType === "virtual" || event.locationType === "hybrid" ? (
                        <>
                          {attendanceStatus === 'initial' && (
                            <div className="space-y-4">
                              <div>
                                <label htmlFor="attendance-code" className="block text-sm font-medium text-gray-700">
                                  Enter Attendance Code
                                </label>
                                <Input
                                  id="attendance-code"
                                  type="text"
                                  placeholder="Enter code provided by organizer"
                                  className="mt-1"
                                  value={attendanceCode}
                                  onChange={(e) => setAttendanceCode(e.target.value)}
                                  disabled={isProcessing}
                                />
                              </div>
                              <Button 
                                onClick={handleSubmitAttendance} 
                                disabled={isProcessing || !attendanceCode.trim()}
                                className="w-full"
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : "Submit Attendance"}
                              </Button>
                            </div>
                          )}

                          {attendanceStatus === 'success' && (
                            <div className="text-center py-6">
                              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                              <h3 className="mt-4 text-lg font-medium text-gray-900">Attendance Recorded</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                Your attendance for this event has been successfully recorded.
                              </p>
                              <Button 
                                onClick={() => setLocation(`/events/${id}`)}
                                className="mt-4"
                              >
                                Return to Event Details
                              </Button>
                            </div>
                          )}

                          {attendanceStatus === 'error' && (
                            <div className="text-center py-6">
                              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                              <h3 className="mt-4 text-lg font-medium text-gray-900">Verification Failed</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                We couldn't verify your attendance code. It may be invalid or expired.
                              </p>
                              <Button 
                                onClick={() => setAttendanceStatus('initial')}
                                className="mt-4"
                              >
                                Try Again
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
                          <h3 className="mt-4 text-lg font-medium text-gray-900">In-Person Attendance</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            This is an in-person event. Please check in with the event organizer at the venue.
                          </p>
                          <Button 
                            onClick={() => setLocation(`/events/${id}`)}
                            className="mt-4"
                          >
                            Return to Event Details
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900">Event not found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    The event you're looking for doesn't exist or you don't have permission to view it.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/events")}
                    className="mt-4"
                  >
                    View All Events
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