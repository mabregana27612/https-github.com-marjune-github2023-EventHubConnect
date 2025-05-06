import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Event as EventType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2, Calendar, MapPin, Clock, Edit, Eye, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState as useModalState } from "react";

type EventWithRegistrations = EventType & {
  registrationCount: number;
  registrationPercentage: number;
};

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useModalState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: events, isLoading } = useQuery<EventWithRegistrations[]>({
    queryKey: ["/api/events"],
  });

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await apiRequest("DELETE", `/api/events/${eventId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Apply filters
  const filteredEvents = events?.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateFilter = dateFilter === "all" || 
      (dateFilter === "upcoming" && new Date(event.eventDate) >= new Date()) ||
      (dateFilter === "past" && new Date(event.eventDate) < new Date());
      
    const matchesLocationFilter = locationFilter === "all" || 
      event.locationType === locationFilter;
      
    const matchesStatusFilter = statusFilter === "all" || 
      event.status === statusFilter;
      
    return matchesSearch && matchesDateFilter && matchesLocationFilter && matchesStatusFilter;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
                <h1 className="text-2xl font-semibold text-gray-900">Event Management</h1>
                {/* Only show Create Event button for admin or speaker users */}
                {user && (user.role === 'admin' || user.role === 'speaker') && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                )}
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="py-4">
                {/* Search and Filters */}
                <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-6">
                  <div className="md:flex md:justify-between">
                    <div className="md:w-1/3 mb-4 md:mb-0">
                      <label htmlFor="event-search" className="block text-sm font-medium text-gray-700">Search Events</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input 
                          id="event-search" 
                          placeholder="Search by title, description, or location"
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    </div>

                    <div className="md:w-2/3 md:flex md:space-x-4">
                      <div className="w-full md:w-1/3 mb-4 md:mb-0">
                        <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700">Date Range</label>
                        <Select
                          value={dateFilter}
                          onValueChange={(value) => {
                            setDateFilter(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger id="date-filter">
                            <SelectValue placeholder="All Dates" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Dates</SelectItem>
                            <SelectItem value="upcoming">Upcoming Events</SelectItem>
                            <SelectItem value="past">Past Events</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-1/3 mb-4 md:mb-0">
                        <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700">Location Type</label>
                        <Select
                          value={locationFilter}
                          onValueChange={(value) => {
                            setLocationFilter(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger id="location-filter">
                            <SelectValue placeholder="All Locations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            <SelectItem value="virtual">Virtual Events</SelectItem>
                            <SelectItem value="in-person">Physical Events</SelectItem>
                            <SelectItem value="hybrid">Hybrid Events</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-1/3">
                        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
                        <Select
                          value={statusFilter}
                          onValueChange={(value) => {
                            setStatusFilter(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger id="status-filter">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="cancelled">Canceled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <>
                    {/* Events Table */}
                    <div className="flex flex-col">
                      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrations</th>
                                  <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedEvents.length > 0 ? (
                                  paginatedEvents.map((event) => (
                                    <tr key={event.id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                            <Calendar className="h-6 w-6 text-primary-600" />
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{event.description}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                          {new Date(event.eventDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{event.venue}</div>
                                        <div className="text-sm text-gray-500">{event.locationType}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.capacity}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge 
                                          variant={
                                            event.status === 'published' ? 'default' : 
                                            event.status === 'draft' ? 'secondary' : 
                                            event.status === 'cancelled' ? 'destructive' : 
                                            'outline'
                                          }
                                        >
                                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </Badge>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                          {event.registrationCount} / {event.capacity}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div 
                                            className="bg-primary-600 h-2 rounded-full" 
                                            style={{ width: `${event.registrationPercentage}%` }}
                                          ></div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex space-x-2 justify-end">
                                          {/* Edit and Delete only for admin or speaker users */}
                                          {user && (user.role === 'admin' || user.role === 'speaker') && (
                                            <>
                                              <button
                                                onClick={() => setLocation(`/events/${event.id}`)}
                                                className="text-primary-600 hover:text-primary-900"
                                                title="Edit event"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="text-red-600 hover:text-red-900"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </>
                                          )}
                                          {/* View is available to all users */}
                                          <a href={`/events/${event.id}`} className="text-gray-600 hover:text-gray-900">
                                            <Eye className="h-4 w-4" />
                                          </a>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                      No events found matching your criteria
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pagination */}
                    {filteredEvents.length > 0 && (
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <Button
                            variant="outline"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                              <span className="font-medium">
                                {Math.min(currentPage * itemsPerPage, filteredEvents.length)}
                              </span>{' '}
                              of <span className="font-medium">{filteredEvents.length}</span> results
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              <Button
                                variant="outline"
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </Button>
                              
                              {/* Page numbers */}
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNumber = i + 1;
                                return (
                                  <Button
                                    key={pageNumber}
                                    variant={currentPage === pageNumber ? "default" : "outline"}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      currentPage === pageNumber
                                        ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                                    onClick={() => setCurrentPage(pageNumber)}
                                  >
                                    {pageNumber}
                                  </Button>
                                );
                              })}
                              
                              {totalPages > 5 && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              
                              <Button
                                variant="outline"
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                              >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </Button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
