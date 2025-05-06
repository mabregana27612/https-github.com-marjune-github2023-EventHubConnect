import { useState } from "react";
import { User } from "@shared/schema";
import { Menu, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    closeMenu();
  };

  const navItems = (() => {
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
  })();

  return (
    <>
      <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow lg:hidden">
        <button
          type="button"
          className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          onClick={toggleMenu}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 px-4 flex justify-between">
          <div className="flex-1 flex items-center">
            <span className="text-xl font-semibold text-primary-600">EventPro</span>
          </div>
          <div className="ml-4 flex items-center md:ml-6">
            <button 
              type="button" 
              className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" />
            </button>
            <div className="ml-3 relative">
              <a href="/profile">
                <Avatar>
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex lg:hidden",
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" onClick={closeMenu}></div>
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white transition-transform ease-in-out duration-300">
          <div className="absolute top-0 right-0 pt-2 pr-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={closeMenu}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          
          <div className="flex-shrink-0 flex items-center px-4">
            <span className="text-xl font-semibold text-primary-600">EventPro</span>
          </div>
          
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            <nav className="px-2 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href + (item.query || '')}
                  className={cn(
                    "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                    isActive(item.href)
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={closeMenu}
                >
                  <item.icon
                    className={cn(
                      "mr-4 h-6 w-6",
                      isActive(item.href) ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.label}
                </a>
              ))}
              
              <button
                onClick={handleLogout}
                className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-red-600 hover:text-red-900 hover:bg-red-50 w-full mt-4"
              >
                <LogOut className="mr-4 h-6 w-6" />
                Sign Out
              </button>
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <a href="/profile" className="flex-shrink-0 group block" onClick={closeMenu}>
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
        </div>
        
        {/* Force sidebar to shrink to fit close icon */}
        <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
      </div>
      
      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 w-full bg-white border-t border-gray-200">
        <div className="flex justify-around">
          {navItems.slice(0, 4).map((item) => (
            <a 
              key={item.label}
              href={item.href + (item.query || '')}
              className={cn(
                "flex flex-col items-center py-2 px-3",
                isActive(item.href) ? "text-primary-600" : "text-gray-500"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
