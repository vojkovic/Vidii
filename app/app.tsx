import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/layout';
import { LoginForm } from './components/login-form';
import { VideoPlayer } from './components/video-player';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoLoginError, setAutoLoginError] = useState('');

  
  const attemptAutoLogin = async (password) => {
    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        
        localStorage.setItem('authToken', data.token);
        setIsAuthenticated(true);
        
        
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        setAutoLoginError('Invalid password in URL');
      }
    } catch (err) {
      console.error('Error during auto-login:', err);
      setAutoLoginError('Error during auto-login');
    }
  };

  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        
        const hashMatch = window.location.hash.match(/^#p=(.+)$/);
        if (hashMatch) {
          try {
            
            const encodedPassword = hashMatch[1];
            const password = atob(encodedPassword);
            
            await attemptAutoLogin(password);
            setIsLoading(false);
            return;
          } catch (decodeError) {
            console.error('Error decoding password:', decodeError);
            setAutoLoginError('Invalid link format');
            setIsLoading(false);
            return;
          }
        }

        
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/session', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout onLogout={isAuthenticated ? handleLogout : undefined}>
      {isAuthenticated ? (
        <VideoPlayer />
      ) : (
        <LoginForm onSuccess={handleLogin} initialError={autoLoginError} />
      )}
    </Layout>
  );
} 