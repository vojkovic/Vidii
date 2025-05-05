import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, 
  Maximize, Minimize, SkipForward, SkipBack,
  AlertTriangle, RefreshCw
} from 'lucide-react';

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);
  
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  
  const getVideoToken = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        setAuthError(true);
        setError('Authentication required. Please login again.');
        setIsLoading(false);
        return null;
      }

      const response = await fetch('/api/video-token', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.status === 401) {
        setAuthError(true);
        setError('Session expired. Please login again.');
        setIsLoading(false);
        return null;
      }
      
      if (!response.ok) {
        console.error('Token error:', response.status);
        return null;
      }
      
      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error('Error getting video token:', err);
      return null;
    }
  }, []);

  
  const loadVideo = useCallback(async () => {
    const token = await getVideoToken();
    if (!token) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    const videoSrc = `/api/video-stream?token=${token}`;
    video.src = videoSrc;
  }, [getVideoToken]);

  
  useEffect(() => {
    loadVideo();
    
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [loadVideo]);

  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    
    const handleVideoError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      console.error('Video error:', target.error);
      
      if (target.error?.code === 4) { 
        
        const authToken = localStorage.getItem('authToken');
        fetch('/api/session', {
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
        })
          .then(res => {
            if (res.status === 401) {
              setAuthError(true);
              setError('Session expired. Please login again.');
            } else {
              setError('Error loading video. Please try again.');
            }
          })
          .catch(err => {
            console.error('Fetch error:', err);
            setError('Error loading video. Please try again.');
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setError('Error loading video. Please try again.');
        setIsLoading(false);
      }
    };

    const onLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    const onPlaying = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);

    return () => {
      if (video) {
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('pause', onPause);
      }
    };
  }, []);

  
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(err => {
        console.error('Error playing video:', err);
        setError('Error playing video');
      });
    } else {
      video.pause();
    }
  };

  
  const handleRefresh = async () => {
    setError('');
    setIsLoading(true);
    setAuthError(false);
    await loadVideo();
  };

  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 1;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  
  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setIsControlsVisible(false);
      }
    }, 3000) as unknown as number;
  };

  
  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div 
        ref={videoContainerRef}
        className="relative overflow-hidden rounded-lg bg-black group"
        onMouseMove={handleMouseMove}
      >
        {isLoading && !error && (
          <div className="flex h-64 md:h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}
        
        {error && (
          <div className="flex h-64 md:h-[400px] flex-col items-center justify-center bg-gray-800/50 text-center p-8">
            <AlertTriangle size={48} className="text-red-400 mb-4" />
            <p className="text-center text-white mb-2 text-lg font-medium">{error}</p>
            {authError ? (
              <p className="text-gray-400 text-sm mb-4">Your session has expired or you don't have permission to view this video.</p>
            ) : (
              <button 
                onClick={handleRefresh} 
                className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh Video
              </button>
            )}
          </div>
        )}
        
        {!error && (
          <video
            ref={videoRef}
            className={`aspect-video w-full ${isLoading ? 'hidden' : ''}`}
            onClick={togglePlay}
            playsInline
          />
        )}

        {}
        {!error && (
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white transition-opacity duration-300 ${
              isControlsVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {}
            <div className="mb-3 flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-600/60 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                style={{
                  backgroundSize: `${(currentTime / duration) * 100}% 100%`,
                  backgroundImage: 'linear-gradient(rgb(59, 130, 246), rgb(59, 130, 246))',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            </div>
            
            {}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {}
                <button onClick={togglePlay} className="rounded-full p-1.5 hover:bg-white/20 transition">
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                
                {}
                <button onClick={skipBackward} className="rounded-full p-1.5 hover:bg-white/20 transition">
                  <SkipBack size={18} />
                </button>
                
                <button onClick={skipForward} className="rounded-full p-1.5 hover:bg-white/20 transition">
                  <SkipForward size={18} />
                </button>
                
                {}
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="rounded-full p-1.5 hover:bg-white/20 transition">
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-gray-600/60 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>
                
                {}
                <div className="text-xs font-medium text-gray-200">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              {}
              <button onClick={toggleFullscreen} className="rounded-full p-1.5 hover:bg-white/20 transition">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 