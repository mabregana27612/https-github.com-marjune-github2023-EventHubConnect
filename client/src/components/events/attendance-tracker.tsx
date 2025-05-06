import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Copy, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AttendanceTrackerProps {
  eventId: number;
  eventTitle: string;
  registrations: {
    id: number;
    user: {
      id: number;
      name: string;
      username: string;
      profileImage: string | null;
    };
    attended: boolean;
    certificateGenerated: boolean;
  }[];
  locationType: string;
}

export function AttendanceTracker({ eventId, eventTitle, registrations, locationType }: AttendanceTrackerProps) {
  const { toast } = useToast();
  const [attendanceCode, setAttendanceCode] = useState<string>("");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Generate a virtual attendance URL for this event
  const baseUrl = window.location.origin;
  const virtualAttendanceUrl = `${baseUrl}/events/${eventId}/attend?code=${attendanceCode}`;

  // QR code data for in-person attendance (admin facing)
  const qrCodeUrl = `${baseUrl}/events/${eventId}/attend`;

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/events/${eventId}/attendance/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      toast({
        title: "Attendance marked",
        description: "Attendance has been successfully recorded.",
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

  // Generate a random attendance code for virtual events
  const generateAttendanceCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    setAttendanceCode(randomCode);
    setCopiedToClipboard(false);
  };

  // Copy attendance link to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(virtualAttendanceUrl);
    setCopiedToClipboard(true);
    toast({
      title: "Link copied",
      description: "Virtual attendance link copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Tracking</CardTitle>
        <CardDescription>
          {locationType === "in-person" 
            ? "Use QR codes for in-person check-in"
            : locationType === "virtual"
              ? "Share attendance code for virtual events"
              : "Track attendance for hybrid events"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attendees">
          <TabsList className="mb-4">
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="checkin">Check-in Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendees">
            {registrations.length > 0 ? (
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
                    {registrations.map(registration => (
                      <tr key={registration.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Avatar className="mr-3">
                              <AvatarImage src={registration.user.profileImage || undefined} />
                              <AvatarFallback>{registration.user.name ? registration.user.name.slice(0, 2).toUpperCase() : <User />}</AvatarFallback>
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
                              onClick={() => markAttendanceMutation.mutate(registration.user.id)}
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
          </TabsContent>
          
          <TabsContent value="checkin">
            <div className="space-y-6">
              {(locationType === "in-person" || locationType === "hybrid") && (
                <div>
                  <h3 className="text-lg font-medium mb-4">In-person Check-in</h3>
                  <div className="flex flex-col items-center bg-gray-50 p-6 rounded-md">
                    <div className="mb-2 bg-white p-3 rounded">
                      <QRCodeSVG 
                        value={qrCodeUrl}
                        size={200}
                        includeMargin
                        level="M"
                      />
                    </div>
                    <p className="text-sm text-center text-gray-600 mt-2">
                      Display this QR code at your event entrance for easy check-in
                    </p>
                  </div>
                </div>
              )}
              
              {(locationType === "virtual" || locationType === "hybrid") && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Virtual Attendance</h3>
                  <div className="bg-gray-50 p-6 rounded-md">
                    <div className="mb-4">
                      <Label htmlFor="attendance-code">Attendance Code</Label>
                      <div className="flex mt-1">
                        <Input
                          id="attendance-code"
                          value={attendanceCode}
                          readOnly
                          className="flex-1 mr-2"
                        />
                        <Button onClick={generateAttendanceCode}>
                          Generate New Code
                        </Button>
                      </div>
                    </div>
                    
                    {attendanceCode && (
                      <div className="mt-4">
                        <Label htmlFor="attendance-link">Attendance Link</Label>
                        <div className="flex mt-1">
                          <Input
                            id="attendance-link"
                            value={virtualAttendanceUrl}
                            readOnly
                            className="flex-1 mr-2"
                          />
                          <Button 
                            onClick={copyToClipboard}
                            variant={copiedToClipboard ? "default" : "outline"}
                          >
                            {copiedToClipboard 
                              ? <><CheckCircle2 className="mr-1 h-4 w-4" /> Copied</> 
                              : <><Copy className="mr-1 h-4 w-4" /> Copy</>
                            }
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Share this link with participants during the virtual event to track attendance
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}