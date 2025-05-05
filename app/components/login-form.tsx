import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { Input } from './ui/input';

interface LoginFormProps {
  onSuccess: () => void;
  initialError?: string;
}

export function LoginForm({ onSuccess, initialError = '' }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter the password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSubmitted(true);
    
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
        
        
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setError(data.message || 'Invalid password');
        setSubmitted(false);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error during authentication:', err);
      setError('An error occurred. Please try again.');
      setSubmitted(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="glass-card rounded-lg px-8 py-10 w-full">
        <div className="flex flex-col space-y-4 mb-6 items-center">
          <div className="p-4 bg-black rounded-full border border-white/10 mb-2">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">
            Protected Video
          </h2>
          <p className="text-gray-400 text-center max-w-xs">
            Enter a password to view
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="username"
            value=""
            aria-hidden="true"
            style={{ display: 'none' }}
            readOnly
          />
          
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                disabled={isLoading || submitted}
                autoComplete="new-password"
                className={`pr-10 border-white/10 bg-black/40 py-6 transition-opacity duration-200 ${
                  submitted ? 'opacity-60' : 'opacity-100'
                }`}
              />
              
              {submitted && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="text-red-400 text-sm px-1">{error}</div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading || submitted || !password}
            className={`w-full btn-primary py-3 flex items-center justify-center transition-opacity duration-200 ${
              isLoading || submitted || !password ? 'opacity-70' : 'opacity-100'
            }`}
          >
            <span>{submitted ? 'Verifying...' : 'Unlock Video'}</span>
            {!submitted && <ArrowRight size={16} className="ml-2" />}
          </button>
        </form>
      </div>
    </div>
  );
} 