import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type EventCardProps = {
  event: {
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
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Card className="bg-white overflow-hidden shadow rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Calendar className="h-6 w-6 text-primary-600" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-primary-600">{event.date}</p>
            <p className="text-lg font-medium text-gray-900 truncate">{event.title}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500 line-clamp-3">{event.description}</p>
        </div>
        <div className="mt-6 flex items-center">
          <div className="flex-shrink-0">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <div className="ml-2 text-sm text-gray-500">{event.location}</div>
        </div>
        <div className="mt-2 flex items-center">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="ml-2 text-sm text-gray-500">{event.time}</div>
        </div>
        <div className="mt-6">
          <Progress value={event.registrationPercentage} className="h-2" />
          <div className="mt-2 text-sm text-gray-500">
            {event.registrationCount} of {event.capacity} spots filled
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-5 py-3">
        <a href={`/events/${event.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-500">
          View details
        </a>
      </CardFooter>
    </Card>
  );
}
