import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { EventCard } from "@/components/events/event-card";

type DashboardStats = {
  totalEvents: number;
  totalUsers: number;
  totalRegistrations: number;
  certificatesIssued: number;
};

type ActivityItem = {
  id: number;
  user: {
    id: number;
    name: string;
    username: string;
    profileImage: string | null;
  };
  description: string;
  timestamp: string;
};

type UpcomingEvent = {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  locationType: string;
  registrationCount: number;
  capacity: number;
  registrationPercentage: number;
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<UpcomingEvent[]>({
    queryKey: ["/api/events/upcoming"],
  });

  const isLoading = statsLoading || activityLoading || eventsLoading;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user as User} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileNav user={user as User} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : (
                <div className="py-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {stats && (
                      <>
                        <StatsCard 
                          title="Total Events"
                          value={stats.totalEvents}
                          icon="calendar"
                          linkText="View all events"
                          linkHref="/events"
                          color="primary"
                        />
                        <StatsCard 
                          title="Registered Users"
                          value={stats.totalUsers}
                          icon="users"
                          linkText="View all users"
                          linkHref="/users"
                          color="green"
                        />
                        <StatsCard 
                          title="Total Registrations"
                          value={stats.totalRegistrations}
                          icon="clipboard"
                          linkText="View all registrations"
                          linkHref="/events"
                          color="amber"
                        />
                        <StatsCard 
                          title="Certificates Issued"
                          value={stats.certificatesIssued}
                          icon="certificate"
                          linkText="View all certificates"
                          linkHref="/certificates"
                          color="purple"
                        />
                      </>
                    )}
                  </div>

                  {/* Recent Activity Section */}
                  <div className="mt-8">
                    <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h2>
                    <ActivityList activities={recentActivity || []} />
                  </div>

                  {/* Upcoming Events Section */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg leading-6 font-medium text-gray-900">Upcoming Events</h2>
                      <a href="/events" className="text-sm font-medium text-primary-600 hover:text-primary-500">View all</a>
                    </div>
                    <div className="mt-2 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {upcomingEvents?.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
