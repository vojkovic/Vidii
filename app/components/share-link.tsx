import React, { useState } from 'react';
import { Link, Check } from 'lucide-react';

export function ShareLink() {
  const [copied, setCopied] = useState(false);
  
  
  const getShareableLink = async () => {
    try {
      
      const response = await fetch('/api/get-password', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get password');
      }
      
      const data = await response.json();
      if (!data.password) {
        throw new Error('Password not available');
      }
      
      
      const url = new URL(window.location.href);
      const encodedPassword = btoa(data.password);
      url.hash = `p=${encodedPassword}`;
      return url.toString();
    } catch (error) {
      console.error('Error generating share link:', error);
      return null;
    }
  };
  
  const copyShareableLink = async () => {
    const link = await getShareableLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };
  
  return (
    <button
      onClick={copyShareableLink}
      className="flex items-center px-3 py-1.5 text-sm text-white/80 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5 active:scale-95 min-w-[120px] justify-center"
      title="Copy auto-login link to clipboard"
    >
      {copied ? (
        <Check size={16} className="mr-1.5 text-green-400" />
      ) : (
        <Link size={16} className="mr-1.5" />
      )}
      <span>Quick Access</span>
    </button>
  );
} 