import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, 
  Maximize, Minimize, SkipForward, SkipBack,
  AlertTriangle, RefreshCw, FileX 
} from 'lucide-react';

export function VideoPlayer() {
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isVideoSourceSetRef = useRef(false);
  
  
  const [videoToken, setVideoToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSkipIndicator, setShowSkipIndicator] = useState<'forward' | 'backward' | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [errorType, setErrorType] = useState<'auth' | 'file' | 'network' | null>(null);
  
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dominantColor, setDominantColor] = useState<string>('rgba(0, 0, 0, 0.5)');
  const [regionColors, setRegionColors] = useState({
    topLeft: 'rgba(0, 0, 0, 0.25)',
    topRight: 'rgba(0, 0, 0, 0.25)',
    bottomLeft: 'rgba(0, 0, 0, 0.25)',
    bottomRight: 'rgba(0, 0, 0, 0.25)',
    center: 'rgba(0, 0, 0, 0.25)'
  });
  
  
  const extractRegionColors = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      
      canvas.width = 20;
      canvas.height = 15;
      
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      
      const regions = {
        topLeft: { x: 0, y: 0, width: canvas.width / 2, height: canvas.height / 2 },
        topRight: { x: canvas.width / 2, y: 0, width: canvas.width / 2, height: canvas.height / 2 },
        bottomLeft: { x: 0, y: canvas.height / 2, width: canvas.width / 2, height: canvas.height / 2 },
        bottomRight: { x: canvas.width / 2, y: canvas.height / 2, width: canvas.width / 2, height: canvas.height / 2 },
        center: { x: canvas.width / 4, y: canvas.height / 4, width: canvas.width / 2, height: canvas.height / 2 }
      };
      
      
      const extractedColors: any = {};
      
      Object.entries(regions).forEach(([region, { x, y, width, height }]) => {
        let rSum = 0, gSum = 0, bSum = 0;
        let pixelCount = 0;
        
        
        for (let row = y; row < y + height; row += 2) {
          for (let col = x; col < x + width; col += 2) {
            const index = (row * canvas.width + col) * 4;
            rSum += data[index];
            gSum += data[index + 1];
            bSum += data[index + 2];
            pixelCount++;
          }
        }
        
        
        const r = Math.floor(rSum / pixelCount);
        const g = Math.floor(gSum / pixelCount);
        const b = Math.floor(bSum / pixelCount);
        
        
        const brightenFactor = 1.2;
        const brightenedR = Math.min(255, Math.floor(r * brightenFactor));
        const brightenedG = Math.min(255, Math.floor(g * brightenFactor));
        const brightenedB = Math.min(255, Math.floor(b * brightenFactor));
        
        extractedColors[region] = `rgba(${brightenedR}, ${brightenedG}, ${brightenedB}, 0.25)`;
      });
      
      
      setDominantColor(extractedColors.center);
      setRegionColors(extractedColors);
    } catch (error) {
      console.error('Error extracting colors:', error);
    }
  }, []);
  
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const extractionInterval = setInterval(() => {
      extractRegionColors();
    }, 2000);
    
    return () => clearInterval(extractionInterval);
  }, [isPlaying, extractRegionColors]);
  
  
  useEffect(() => {
    async function getToken() {
      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setError('Authentication required');
          setErrorDetails('Please login again to access the video.');
          setErrorType('auth');
          setIsLoading(false);
          return;
        }
        
        const response = await fetch('/api/video-token', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Session expired');
            setErrorDetails('Your login session has expired. Please login again.');
            setErrorType('auth');
          } else if (response.status === 404) {
            const data = await response.json();
            setError('Video not available');
            setErrorDetails(data.details || 'The requested video could not be found.');
            setErrorType('file');
          } else {
            setError(`Server error (${response.status})`);
            setErrorDetails('There was a problem with the video service. Please try again later.');
            setErrorType('network');
          }
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        setVideoToken(data.token);
      } catch (err) {
        console.error('Error fetching video token:', err);
        setError('Connection error');
        setErrorDetails('Could not connect to the video service. Please check your internet connection and try again.');
        setErrorType('network');
        setIsLoading(false);
      }
    }
    
    getToken();
    
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);
  
  
  useEffect(() => {
    if (!videoToken || !videoRef.current || isVideoSourceSetRef.current) return;
    
    isVideoSourceSetRef.current = true;
    
    const video = videoRef.current;
    video.src = `/api/video-stream?token=${videoToken}`;
    
    const handleVideoError = () => {
      console.error('Video error:', video.error);
      
      if (video.error?.code === 2) {
        setError('Network error');
        setErrorDetails('The video stream was interrupted. Please check your connection and try again.');
        setErrorType('network');
      } else if (video.error?.code === 4) {
        setError('Format error');
        setErrorDetails('The video format is not supported or the video file is corrupted.');
        setErrorType('file');
      } else {
        setError('Video playback error');
        setErrorDetails('An error occurred while trying to play the video. Please try refreshing the page.');
        setErrorType('network');
      }
      
      setIsLoading(false);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      
      setTimeout(extractRegionColors, 500);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      startControlsTimer();
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      showVideoControls();
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      showVideoControls();
    };
    
    video.volume = volume;
    video.muted = isMuted;
    
    video.addEventListener('error', handleVideoError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoToken, extractRegionColors]);
  
  
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }, [volume, isMuted]);
  
  
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handleSeeking = () => {
      
    };
    
    const handleSeeked = () => {
      setIsLoading(false);
      
      if (isPlaying && video.paused) {
        video.play().catch(err => console.error('Error resuming after seek:', err));
      }
    };
    
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    
    return () => {
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [isPlaying]);
  
  
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play()
        .catch(err => {
          console.error('Error playing video:', err);
          setError('Playback error');
          setErrorDetails('Could not start playback. The video might be corrupted or unavailable.');
          setErrorType('network');
        });
    } else {
      videoRef.current.pause();
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const skipForward = () => {
    if (!videoRef.current) return;
    
    setShowSkipIndicator('forward');
    setTimeout(() => setShowSkipIndicator(null), 800);
    
    videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
  };
  
  const skipBackward = () => {
    if (!videoRef.current) return;
    
    setShowSkipIndicator('backward');
    setTimeout(() => setShowSkipIndicator(null), 800);
    
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .catch(err => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen()
        .catch(err => console.error('Error exiting fullscreen:', err));
    }
  };
  
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };
  
  const showVideoControls = () => {
    setShowControls(true);
    
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  };
  
  const startControlsTimer = () => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowVolumeSlider(false);
      }
    }, 3000);
  };
  
  const handleMouseMove = () => {
    showVideoControls();
    if (isPlaying) {
      startControlsTimer();
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const handleRefresh = () => {
    isVideoSourceSetRef.current = false;
    setError('');
    setErrorDetails('');
    setErrorType(null);
    setIsLoading(true);
    
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      fetch('/api/video-token', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(`Server responded with ${response.status}`);
      })
      .then(data => {
        setVideoToken(data.token);
      })
      .catch(err => {
        console.error('Error refreshing video:', err);
        setError('Refresh failed');
        setErrorDetails('Could not refresh the video. Please try reloading the page.');
        setErrorType('network');
        setIsLoading(false);
      });
    } else {
      window.location.reload();
    }
  };

  
  const containerClasses = isFullscreen
    ? "relative overflow-hidden bg-black h-screen flex items-center justify-center"
    : "relative overflow-hidden rounded-xl bg-black border border-white/5 shadow-md";

  const glowContainerStyle = {
    position: 'relative' as const,
  };

  return (
    <div className="flex items-center justify-center w-full min-h-[calc(100vh-250px)] py-8">
      <div className="w-full max-w-4xl mx-auto overflow-visible relative" style={{ clipPath: 'none' }}>
        <div className="absolute inset-0 -z-10" style={{
          filter: 'blur(40px)',
          transform: 'scale(1.2)',
          opacity: 0.5,
          background: `
            radial-gradient(circle at 30% 30%, ${regionColors.topLeft}, transparent 70%),
            radial-gradient(circle at 70% 70%, ${regionColors.bottomRight}, transparent 70%),
            radial-gradient(circle at center, ${regionColors.center}, transparent 60%)
          `,
          transition: 'background 2s ease-in-out'
        }} />
        
        <div 
          ref={containerRef}
          className={containerClasses}
          style={glowContainerStyle}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {}
          <canvas 
            ref={canvasRef} 
            width="20" 
            height="20" 
            style={{ display: 'none' }}
          />
          
          {}
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
            </div>
          )}
          
          {}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-8">
              <div className="p-4 rounded-full bg-black/60 border border-red-500/20 mb-4">
                {errorType === 'auth' && (
                  <AlertTriangle size={36} className="text-yellow-400" />
                )}
                {errorType === 'file' && (
                  <FileX size={36} className="text-red-400" />
                )}
                {(errorType === 'network' || !errorType) && (
                  <AlertTriangle size={36} className="text-red-400" />
                )}
              </div>
              <h3 className="text-center text-white mb-2 text-xl font-bold">{error}</h3>
              <p className="text-gray-400 mb-6">{errorDetails}</p>
              {errorType !== 'file' && (
                <button 
                  onClick={handleRefresh} 
                  className="flex items-center px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Refresh Player
                </button>
              )}
              {errorType === 'auth' && (
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 flex items-center px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-md text-white font-medium transition-colors"
                >
                  Login Again
                </button>
              )}
            </div>
          )}
          
          {}
          {!error && (
            <div className={`relative ${isFullscreen ? 'h-full w-full flex items-center justify-center' : ''}`}>
              <div className={`flex justify-center items-center bg-black ${isFullscreen ? 'h-full' : ''}`}>
                <video
                  ref={videoRef}
                  className={`w-full ${isFullscreen ? 'h-auto max-h-screen max-w-screen' : 'aspect-video'} ${isLoading && !videoRef.current?.seeking ? 'hidden' : 'block'}`}
                  onClick={togglePlay}
                  playsInline
                  style={{
                    objectFit: isFullscreen ? 'contain' : 'fill'
                  }}
                />
              </div>

              {}
              {showSkipIndicator && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                  <div className={`bg-black/70 rounded-md px-4 py-2 flex items-center ${showSkipIndicator === 'forward' ? 'translate-x-10' : '-translate-x-10'}`}>
                    {showSkipIndicator === 'forward' ? (
                      <>
                        <span className="text-white font-medium mr-2">+10s</span>
                        <SkipForward size={20} className="text-white" />
                      </>
                    ) : (
                      <>
                        <SkipBack size={20} className="text-white" />
                        <span className="text-white font-medium ml-2">-10s</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {}
              {!isPlaying && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <button 
                    onClick={togglePlay}
                    className="flex items-center justify-center w-20 h-20 bg-black/60 rounded-full pointer-events-auto text-white"
                  >
                    <Play size={32} className="ml-1" />
                  </button>
                </div>
              )}
              
              {}
              {!isLoading && (
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-white transition-opacity duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {}
                  <div 
                    ref={progressRef}
                    className="mb-3 relative h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden"
                    onClick={handleProgressClick}
                  >
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeekChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full bg-white"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                  </div>
                  
                  {}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {}
                      <button 
                        onClick={togglePlay} 
                        className="rounded-full p-2 hover:bg-white/10 transition-colors"
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      
                      {}
                      <button 
                        onClick={skipBackward} 
                        className="rounded-full p-2 hover:bg-white/10 transition-colors flex items-center"
                        aria-label="Skip back 10 seconds"
                      >
                        <SkipBack size={18} />
                        <span className="text-xs ml-0.5 hidden sm:inline-block">10</span>
                      </button>
                      
                      <button 
                        onClick={skipForward} 
                        className="rounded-full p-2 hover:bg-white/10 transition-colors flex items-center"
                        aria-label="Skip forward 10 seconds"
                      >
                        <SkipForward size={18} />
                        <span className="text-xs ml-0.5 hidden sm:inline-block">10</span>
                      </button>
                      
                      {}
                      <div className="relative flex items-center">
                        <button 
                          onClick={toggleMute} 
                          onMouseEnter={() => setShowVolumeSlider(true)}
                          className="rounded-full p-2 hover:bg-white/10 transition-colors"
                          aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        
                        {}
                        {showVolumeSlider && (
                          <div 
                            className="absolute left-10 top-1/2 -translate-y-1/2 bg-black/90 rounded-md px-3 py-2 w-24 z-20"
                            onMouseLeave={() => setShowVolumeSlider(false)}
                          >
                            <div className="relative h-1.5 rounded-full bg-white/20">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                aria-label="Volume"
                              />
                              <div 
                                className="absolute top-0 left-0 h-full rounded-full bg-white"
                                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {}
                      <div className="hidden sm:flex items-center text-sm text-white/90">
                        <span className="font-medium">
                          {formatTime(currentTime)}
                        </span>
                        <span className="text-white/50 mx-1">/</span>
                        <span className="text-white/70">
                          {formatTime(duration)}
                        </span>
                      </div>
                    </div>
                    
                    {}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={toggleFullscreen} 
                        className="rounded-full p-2 hover:bg-white/10 transition-colors"
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 