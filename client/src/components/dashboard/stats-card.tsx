import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  Clipboard, 
  Award,
  LucideIcon 
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: "calendar" | "users" | "clipboard" | "certificate";
  linkText: string;
  linkHref: string;
  color: "primary" | "green" | "amber" | "purple";
}

export function StatsCard({ title, value, icon, linkText, linkHref, color }: StatsCardProps) {
  const getIcon = (): LucideIcon => {
    switch (icon) {
      case "calendar":
        return Calendar;
      case "users":
        return Users;
      case "clipboard":
        return Clipboard;
      case "certificate":
        return Award;
      default:
        return Calendar;
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case "primary":
        return {
          bg: "bg-primary-100",
          text: "text-primary-600",
          linkText: "text-primary-600 hover:text-primary-500"
        };
      case "green":
        return {
          bg: "bg-green-100",
          text: "text-green-600",
          linkText: "text-green-600 hover:text-green-500"
        };
      case "amber":
        return {
          bg: "bg-amber-100",
          text: "text-amber-600",
          linkText: "text-amber-600 hover:text-amber-500"
        };
      case "purple":
        return {
          bg: "bg-purple-100",
          text: "text-purple-600",
          linkText: "text-purple-600 hover:text-purple-500"
        };
      default:
        return {
          bg: "bg-primary-100",
          text: "text-primary-600",
          linkText: "text-primary-600 hover:text-primary-500"
        };
    }
  };

  const Icon = getIcon();
  const colorClasses = getColorClasses();

  return (
    <Card className="bg-white overflow-hidden shadow rounded-lg">
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses.bg} rounded-md p-3`}>
            <Icon className={`h-6 w-6 ${colorClasses.text}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <a href={linkHref} className={`font-medium ${colorClasses.linkText}`}>
            {linkText}
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
