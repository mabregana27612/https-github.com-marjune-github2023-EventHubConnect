import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2, Search, UserPlus, Edit, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SpeakerWithEvents = User & {
  events: {
    id: number;
    title: string;
    eventDate: string;
  }[];
};

const speakerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  bio: z.string().optional(),
});

export default function Speakers() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: speakers, isLoading } = useQuery<SpeakerWithEvents[]>({
    queryKey: ["/api/speakers"],
  });

  const form = useForm<z.infer<typeof speakerFormSchema>>({
    resolver: zodResolver(speakerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      bio: "",
    },
  });

  const addSpeakerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof speakerFormSchema>) => {
      const speakerData = {
        ...data,
        role: "speaker",
      };
      await apiRequest("POST", "/api/speakers", speakerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speakers"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Speaker added",
        description: "The speaker has been successfully added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add speaker",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSpeakerMutation = useMutation({
    mutationFn: async (speakerId: number) => {
      await apiRequest("DELETE", `/api/speakers/${speakerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speakers"] });
      toast({
        title: "Speaker deleted",
        description: "The speaker has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete speaker",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof speakerFormSchema>) => {
    addSpeakerMutation.mutate(data);
  };

  const filteredSpeakers = speakers?.filter(speaker => 
    speaker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    speaker.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    speaker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user as User} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileNav user={user as User} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Speaker Management</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Speaker
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Speaker</DialogTitle>
                      <DialogDescription>
                        Fill in the details to add a new speaker to the platform.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter full name" {...field} />
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
                                <Input type="email" placeholder="Enter email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Choose a username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create a password" {...field} />
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
                                  placeholder="Enter speaker bio (optional)" 
                                  className="resize-none" 
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={addSpeakerMutation.isPending}>
                            {addSpeakerMutation.isPending ? "Adding..." : "Add Speaker"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="py-4">
                {/* Search Input */}
                <div className="mb-6">
                  <Label htmlFor="search-speakers" className="block text-sm font-medium text-gray-700">Search Speakers</Label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input 
                      id="search-speakers" 
                      placeholder="Search by name, username, or email"
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredSpeakers && filteredSpeakers.length > 0 ? (
                      filteredSpeakers.map(speaker => (
                        <Card key={speaker.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center">
                              <Avatar className="h-20 w-20 mb-4">
                                <AvatarImage src={speaker.profileImage || undefined} />
                                <AvatarFallback className="text-lg">{speaker.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <h3 className="text-lg font-semibold text-gray-900">{speaker.name}</h3>
                              <Badge variant="outline" className="mt-1">@{speaker.username}</Badge>
                              <p className="text-sm text-gray-500 mt-2">{speaker.email}</p>
                              
                              {speaker.bio && (
                                <p className="text-sm text-gray-700 mt-4 text-center line-clamp-3">
                                  {speaker.bio}
                                </p>
                              )}
                              
                              {speaker.events && speaker.events.length > 0 && (
                                <div className="mt-4 w-full">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Upcoming Events
                                  </h4>
                                  <ul className="space-y-1">
                                    {speaker.events.slice(0, 3).map(event => (
                                      <li key={event.id} className="text-sm">
                                        <a 
                                          href={`/events/${event.id}`}
                                          className="text-primary-600 hover:text-primary-800"
                                        >
                                          {event.title}
                                        </a>
                                        <span className="text-xs text-gray-500 ml-1">
                                          ({new Date(event.eventDate).toLocaleDateString()})
                                        </span>
                                      </li>
                                    ))}
                                    {speaker.events.length > 3 && (
                                      <li className="text-xs text-gray-500">
                                        +{speaker.events.length - 3} more events
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="flex mt-6 space-x-2">
                                <Button variant="outline" size="sm" className="h-8 flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Contact
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 flex items-center">
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteSpeakerMutation.mutate(speaker.id)}
                                  disabled={deleteSpeakerMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <h3 className="text-lg font-medium text-gray-900">No speakers found</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          {searchTerm 
                            ? "Try adjusting your search criteria" 
                            : "Start by adding a speaker to the platform"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
