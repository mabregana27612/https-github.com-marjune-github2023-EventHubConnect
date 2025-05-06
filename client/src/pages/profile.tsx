import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2, User as UserIcon, Mail, Calendar, Award, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UserProfile = User & {
  attendedEvents: {
    id: number;
    title: string;
    eventDate: string;
    certificateUrl?: string;
  }[];
  upcomingRegistrations: {
    id: number;
    title: string;
    eventDate: string;
    startTime: string;
    venue: string;
  }[];
  signatureImage?: string;
};

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  bio: z.string().optional(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const isSpeaker = user?.role === "speaker" || user?.role === "admin";

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
      bio: profile?.bio || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when profile data is loaded
  useState(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        email: profile.email,
        bio: profile.bio || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", "/api/user"] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user as User} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileNav user={user as User} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : profile ? (
                <div className="py-4">
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                      <div className="flex items-center">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={profile.profileImage || undefined} />
                          <AvatarFallback className="text-lg">{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                          <p className="text-sm text-gray-500">@{profile.username}</p>
                        </div>
                      </div>
                      {!isEditing && (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                    
                    <Tabs defaultValue={isEditing ? "edit" : "info"} value={isEditing ? "edit" : "info"}>
                      <div className="px-4 pt-3 sm:px-6 border-b border-gray-200">
                        <TabsList>
                          <TabsTrigger value="info" disabled={isEditing}>Profile Information</TabsTrigger>
                          <TabsTrigger value="events">My Events</TabsTrigger>
                          <TabsTrigger value="certificates">My Certificates</TabsTrigger>
                          <TabsTrigger value="edit" disabled={!isEditing}>Edit Profile</TabsTrigger>
                        </TabsList>
                      </div>
                      
                      <TabsContent value="info">
                        <dl>
                          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                              <UserIcon className="mr-2 h-4 w-4" />
                              Full Name
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                              {profile.name}
                            </dd>
                          </div>
                          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                              {profile.email}
                            </dd>
                          </div>
                          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                              <Calendar className="mr-2 h-4 w-4" />
                              Member Since
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                              {new Date(profile.createdAt).toLocaleDateString()}
                            </dd>
                          </div>
                          {profile.bio && (
                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                              <dt className="text-sm font-medium text-gray-500">
                                Bio
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {profile.bio}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </TabsContent>
                      
                      <TabsContent value="events">
                        <div className="px-4 py-5 sm:px-6">
                          <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Registrations</h3>
                          <div className="mt-4">
                            {profile.upcomingRegistrations && profile.upcomingRegistrations.length > 0 ? (
                              <div className="overflow-hidden bg-white shadow sm:rounded-md">
                                <ul role="list" className="divide-y divide-gray-200">
                                  {profile.upcomingRegistrations.map(event => (
                                    <li key={event.id}>
                                      <a href={`/events/${event.id}`} className="block hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6">
                                          <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-primary-600 truncate">{event.title}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                              <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {new Date(event.eventDate).toLocaleDateString()}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                              <p className="flex items-center text-sm text-gray-500">
                                                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                {event.startTime.slice(0, 5)}
                                              </p>
                                              <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                </svg>
                                                {event.venue}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">You are not registered for any upcoming events.</p>
                            )}
                          </div>
                          
                          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-8">Past Events</h3>
                          <div className="mt-4">
                            {profile.attendedEvents && profile.attendedEvents.length > 0 ? (
                              <div className="overflow-hidden bg-white shadow sm:rounded-md">
                                <ul role="list" className="divide-y divide-gray-200">
                                  {profile.attendedEvents.map(event => (
                                    <li key={event.id}>
                                      <a href={`/events/${event.id}`} className="block hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6">
                                          <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-primary-600 truncate">{event.title}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                              <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {new Date(event.eventDate).toLocaleDateString()}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                              <p className="flex items-center text-sm text-gray-500">
                                                {event.certificateUrl ? (
                                                  <a 
                                                    href={event.certificateUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary-600 hover:text-primary-800 flex items-center"
                                                  >
                                                    <Award className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                                    View Certificate
                                                  </a>
                                                ) : (
                                                  <span className="text-gray-400">No certificate available</span>
                                                )}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">You haven't attended any events yet.</p>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="certificates">
                        <div className="px-4 py-5 sm:px-6">
                          {isSpeaker && (
                            <div className="mb-8 border rounded-md p-4">
                              <h3 className="text-lg font-medium mb-2">Speaker Signature</h3>
                              <p className="text-sm text-gray-500 mb-4">
                                Upload your signature to be used on certificates. This will be displayed on certificates for events where you are a speaker.
                              </p>
                              <div className="flex items-start space-x-4">
                                <div className="border rounded-md p-4 bg-gray-50 w-48 h-24 flex items-center justify-center">
                                  {profile.signatureImage ? (
                                    <img 
                                      src={profile.signatureImage} 
                                      alt="Signature" 
                                      className="max-w-full max-h-full"
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-400">No signature uploaded</p>
                                  )}
                                </div>
                                <div>
                                  <label
                                    className="cursor-pointer"
                                  >
                                    <Button 
                                      variant="outline" 
                                      type="button"
                                      onClick={() => {}}
                                    >
                                      Upload Signature
                                    </Button>
                                    <input
                                      type="file"
                                      accept="image/png"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = async (event) => {
                                            try {
                                              const base64Image = event.target?.result as string;
                                              await apiRequest("PATCH", "/api/profile/signature", {
                                                signatureImage: base64Image
                                              });
                                              queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
                                              toast({
                                                title: "Signature uploaded",
                                                description: "Your signature has been updated successfully."
                                              });
                                            } catch (error) {
                                              toast({
                                                title: "Upload failed",
                                                description: error instanceof Error ? error.message : "Failed to upload signature",
                                                variant: "destructive"
                                              });
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Upload a transparent PNG image of your signature.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <h3 className="text-lg leading-6 font-medium text-gray-900">My Certificates</h3>
                          <div className="mt-4">
                            {profile.attendedEvents && profile.attendedEvents.some(e => e.certificateUrl) ? (
                              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {profile.attendedEvents
                                  .filter(event => event.certificateUrl)
                                  .map(event => (
                                    <Card key={event.id} className="overflow-hidden">
                                      <CardHeader className="bg-primary-50 pb-2">
                                        <CardTitle className="text-lg">{event.title}</CardTitle>
                                        <CardDescription>
                                          Certificate of Attendance
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent className="pt-4">
                                        <div className="space-y-4">
                                          <div className="flex items-center text-sm">
                                            <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700 font-medium">Event Date:</span>
                                            <span className="ml-2">{new Date(event.eventDate).toLocaleDateString()}</span>
                                          </div>
                                        </div>
                                      </CardContent>
                                      <CardFooter className="bg-gray-50 pt-2">
                                        <Button className="w-full" asChild>
                                          <a 
                                            href={event.certificateUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <Award className="mr-2 h-4 w-4" />
                                            View Certificate
                                          </a>
                                        </Button>
                                      </CardFooter>
                                    </Card>
                                  ))
                                }
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Award className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No certificates yet</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  Attend events to receive certificates of attendance.
                                </p>
                                <div className="mt-6">
                                  <Button onClick={() => window.location.href = "/events"}>
                                    Browse Events
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="edit">
                        <div className="px-4 py-5 sm:px-6">
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter your full name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input type="email" placeholder="Enter your email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="bio"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Tell us a little about yourself" 
                                        className="resize-none" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="pt-5 border-t border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                                
                                <FormField
                                  control={form.control}
                                  name="currentPassword"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Current Password</FormLabel>
                                      <FormControl>
                                        <Input type="password" placeholder="Enter your current password" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                          <Input type="password" placeholder="Enter new password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                          <Input type="password" placeholder="Confirm new password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              
                              <div className="pt-5 flex justify-end space-x-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsEditing(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="submit"
                                  disabled={updateProfileMutation.isPending}
                                >
                                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900">Profile not found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Could not load your profile information.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
