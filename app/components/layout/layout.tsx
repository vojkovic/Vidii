import React from 'react';
import { LogOut } from 'lucide-react';
import { ShareLink } from '../share-link';
import { BrandLogo } from '../brand-logo';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background/90 text-foreground">
      <header className="border-b border-white/5 backdrop-blur-md bg-black/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo size="md" />
          
          {onLogout && (
            <div className="flex items-center gap-3">
              <ShareLink />
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-white/80 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5 active:scale-95"
              >
                <LogOut size={16} className="mr-1" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
} 