import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2, Search, Download, ExternalLink, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Certificate = {
  id: number;
  eventId: number;
  eventTitle: string;
  userId: number;
  userName: string;
  eventDate: string;
  issuedAt: string;
  certificateUrl: string;
};

export default function Certificates() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");

  const { data: certificates, isLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
  });

  const filteredCertificates = certificates?.filter(cert => 
    (searchTerm === "" || 
      cert.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.userName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (timeFilter === "all" || 
      (timeFilter === "this_month" && new Date(cert.issuedAt) >= new Date(new Date().setDate(1))) ||
      (timeFilter === "this_year" && new Date(cert.issuedAt).getFullYear() === new Date().getFullYear()))
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user as User} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileNav user={user as User} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Certificates</h1>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="py-4">
                {/* Search and Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="search-certificates" className="block text-sm font-medium text-gray-700">Search Certificates</Label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input 
                        id="search-certificates" 
                        placeholder="Search by event or user name"
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="time-filter" className="block text-sm font-medium text-gray-700">Time Period</Label>
                    <Select
                      value={timeFilter}
                      onValueChange={setTimeFilter}
                    >
                      <SelectTrigger id="time-filter" className="mt-1">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="this_year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCertificates && filteredCertificates.length > 0 ? (
                      filteredCertificates.map(certificate => (
                        <Card key={certificate.id} className="overflow-hidden">
                          <CardHeader className="bg-primary-50 pb-2">
                            <CardTitle className="text-lg">{certificate.eventTitle}</CardTitle>
                            <CardDescription>
                              Certificate of Attendance
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              <div className="flex items-center text-sm">
                                <Users className="mr-2 h-4 w-4 text-gray-500" />
                                <span className="text-gray-700 font-medium">Issued to:</span>
                                <span className="ml-2">{certificate.userName}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                                <span className="text-gray-700 font-medium">Event Date:</span>
                                <span className="ml-2">{new Date(certificate.eventDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                                <span className="text-gray-700 font-medium">Issued on:</span>
                                <span className="ml-2">{new Date(certificate.issuedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="bg-gray-50 pt-2">
                            <div className="flex w-full justify-between">
                              <Button variant="outline" size="sm" asChild>
                                <a 
                                  href={certificate.certificateUrl} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View
                                </a>
                              </Button>
                              <Button size="sm" asChild>
                                <a 
                                  href={`${certificate.certificateUrl}?download=true`}
                                  download
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <h3 className="text-lg font-medium text-gray-900">No certificates found</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          {searchTerm || timeFilter !== "all"
                            ? "Try adjusting your search criteria" 
                            : isAdmin 
                              ? "No certificates have been generated yet" 
                              : "Attend events to receive attendance certificates"}
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
