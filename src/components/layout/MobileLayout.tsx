
import React, { useState } from 'react';
import { X, Menu, Home, Users, Image, Map, Clock, BookOpen, Crown, User, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/auth/UserProfile';
import { useNavigate } from 'react-router-dom';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  currentUser?: { 
    name: string; 
    email?: string;
    avatar?: string 
  };
  showBackButton?: boolean;
  icon?: React.ReactNode;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Users, label: "Family Tree", href: "/family-tree" },
  { icon: Map, label: "Map", href: "/map" },
  { icon: BookOpen, label: "Stories", href: "/stories" },
  { icon: Image, label: "Albums", href: "/albums" },
  { icon: Clock, label: "Timeline", href: "/timeline" },
];

const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  children, 
  title = "Kinship Atlas", 
  currentUser,
  showBackButton = false,
  icon
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-heritage-light">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-heritage-purple/20 shadow-sm">
        <div className="flex items-center justify-between p-4">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="text-heritage-dark"
            >
              <X size={24} />
              <span className="sr-only">Back</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDrawerOpen(true)}
              className="text-heritage-dark"
            >
              <Menu size={24} />
              <span className="sr-only">Menu</span>
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            {icon && <span className="text-heritage-purple">{icon}</span>}
            <h1 className="text-xl font-serif font-semibold text-heritage-purple">{title}</h1>
          </div>
          
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-green-600">
                <User className="h-3 w-3" />
                <span>Logged in</span>
              </div>
              <UserProfile onProfileClick={handleProfileClick} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-red-600">
                <LogOut className="h-3 w-3" />
                <span>Not logged in</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-sm"
                onClick={() => navigate('/auth')}
              >
                Login
              </Button>
            </div>
          )}
        </div>
      </header>
      
      {/* Mobile Nav Drawer */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity",
          isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsDrawerOpen(false)}
      />
      
      <div 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transition-transform",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-serif text-lg font-medium text-heritage-purple">Kinship Atlas</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsDrawerOpen(false)}
            className="text-heritage-dark"
          >
            <X size={18} />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        {user && (
          <div className="p-4 border-b flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-full bg-cover bg-center border border-heritage-purple/30"
              style={{ backgroundImage: `url(${user.user_metadata?.avatar_url})` }}
            />
            <div>
              <p className="font-medium text-heritage-dark">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </p>
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs text-heritage-purple"
                onClick={handleProfileClick}
              >
                View Profile
              </Button>
            </div>
          </div>
        )}
        
        <nav className="p-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-heritage-purple-light text-heritage-dark hover:text-heritage-purple transition-colors"
              onClick={() => setIsDrawerOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </a>
          ))}
          
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-heritage-purple-light text-heritage-dark hover:text-heritage-purple transition-colors border-t border-heritage-purple/20 mt-2 pt-3"
              onClick={() => setIsDrawerOpen(false)}
            >
              <Crown size={18} />
              <span>Admin</span>
            </a>
          )}
        </nav>
      </div>
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Bottom Nav Bar */}
      <nav className="sticky bottom-0 z-30 bg-white border-t border-heritage-purple/20 shadow-lg md:hidden">
        <div className="grid grid-cols-5 gap-1 p-1">
          {navItems.slice(0, 5).map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex flex-col items-center py-2 px-1 text-heritage-neutral hover:text-heritage-purple transition-colors"
            >
              <item.icon size={20} />
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
