import { useMemo } from "react";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { 
  Home, 
  Calendar, 
  Users, 
  Award, 
  User as UserIcon, 
  Search, 
  Clipboard, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = useMemo(() => {
    const items = [];

    if (user.role === 'admin') {
      items.push(
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/events', label: 'Events', icon: Calendar },
        { href: '/speakers', label: 'Speakers', icon: Users },
        { href: '/users', label: 'Users', icon: Users },
        { href: '/certificates', label: 'Certificates', icon: Award }
      );
    } else if (user.role === 'speaker') {
      items.push(
        { href: '/dashboard', label: 'My Events', icon: Calendar },
        { href: '/profile', label: 'Profile', icon: UserIcon }
      );
    } else {
      items.push(
        { href: '/events', label: 'Browse Events', icon: Search },
        { href: '/events', label: 'My Registrations', icon: Clipboard, query: '?filter=registered' },
        { href: '/certificates', label: 'My Certificates', icon: Award },
        { href: '/profile', label: 'Profile', icon: UserIcon }
      );
    }

    return items;
  }, [user.role]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <span className="text-xl font-semibold text-primary-600">EventPro</span>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href + (item.query || '')}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    isActive(item.href)
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-6 w-6",
                      isActive(item.href) ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
        
        {/* User Profile Section */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <a href="/profile" className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div>
                <Avatar>
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                  {user.name}
                </p>
                <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </p>
              </div>
            </div>
          </a>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-2">
          <button 
            onClick={handleLogout}
            className="flex items-center px-2 py-2 text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50 w-full rounded-md"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
