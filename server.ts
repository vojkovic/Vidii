const express = require('express');
const { createServer: createViteServer } = require('vite');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const nodeCrypto = require('crypto');


const authTokens = new Map<string, { expires: number }>();
const videoTokens = new Map<string, { expires: number, authToken: string }>();
let cleanupInterval: NodeJS.Timeout | null = null;


function generateAuthToken(): string {
  const token = nodeCrypto.randomBytes(32).toString('hex');
  authTokens.set(token, { expires: Date.now() + (24 * 60 * 60 * 1000) });
  
  if (!cleanupInterval) startTokenCleanup();
  return token;
}


function validateAuthToken(token: string): boolean {
  const tokenData = authTokens.get(token);
  if (!tokenData) return false;
  
  if (Date.now() > tokenData.expires) {
    authTokens.delete(token);
    return false;
  }
  return true;
}


function generateVideoToken(authToken: string): string {
  const token = nodeCrypto.randomBytes(32).toString('hex');
  videoTokens.set(token, { 
    expires: Date.now() + (30 * 60 * 1000),
    authToken
  });
  
  if (!cleanupInterval) startTokenCleanup();
  return token;
}


function validateVideoToken(token: string): boolean {
  const tokenData = videoTokens.get(token);
  if (!tokenData) return false;
  
  if (Date.now() > tokenData.expires) {
    videoTokens.delete(token);
    return false;
  }
  
  if (!validateAuthToken(tokenData.authToken)) {
    videoTokens.delete(token);
    return false;
  }
  
  return true;
}


function startTokenCleanup() {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    
    for (const [token, data] of authTokens.entries()) {
      if (now > data.expires) authTokens.delete(token);
    }
    
    
    for (const [token, data] of videoTokens.entries()) {
      if (now > data.expires) videoTokens.delete(token);
    }
  }, 60 * 60 * 1000); 
}


function getVideoPath(): string {
  try {
    const configPath = path.resolve('./config.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    return config.video_path || '';
  } catch (error) {
    console.error('Error loading config:', error);
    return '';
  }
}


function checkVideoFile(): { exists: boolean, error?: string } {
  try {
    const videoPath = getVideoPath();
    
    if (!videoPath) {
      return { exists: false, error: 'Video path not configured in config.yaml' };
    }
    
    if (!fs.existsSync(videoPath)) {
      return { exists: false, error: `Video file not found at path: ${videoPath}` };
    }
    
    const stats = fs.statSync(videoPath);
    if (!stats.isFile()) {
      return { exists: false, error: `Path exists but is not a file: ${videoPath}` };
    }
    
    return { exists: true };
  } catch (error) {
    console.error('Error checking video file:', error);
    return { exists: false, error: `Error accessing video file: ${error.message}` };
  }
}


function getPassword(): string {
  try {
    const configPath = path.resolve('./config.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    return config.password || 'password';
  } catch (error) {
    console.error('Error loading config:', error);
    return 'password';
  }
}


function requireAuth(req, res, next) {
  const authToken = req.headers.authorization?.split(' ')[1];
  
  if (authToken && validateAuthToken(authToken)) {
    return next();
  }
  
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

async function createServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());
  
  
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  
  app.post('/api/verify-password', (req, res) => {
    try {
      const { password } = req.body || {};
      
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required' });
      }
      
      if (password === getPassword()) {
        const token = generateAuthToken();
        return res.json({ success: true, token });
      } else {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  
  app.get('/api/get-password', requireAuth, (req, res) => {
    try {
      const password = getPassword();
      return res.json({ password });
    } catch (error) {
      console.error('Get password error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  
  app.post('/api/logout', requireAuth, (req, res) => {
    const authToken = req.headers.authorization?.split(' ')[1];
    if (authToken) {
      
      authTokens.delete(authToken);
      
      
      for (const [token, data] of videoTokens.entries()) {
        if (data.authToken === authToken) {
          videoTokens.delete(token);
        }
      }
    }
    
    res.json({ success: true });
  });

  
  app.get('/api/video-token', requireAuth, (req, res) => {
    const authToken = req.headers.authorization?.split(' ')[1];
    if (!authToken) {
      return res.status(401).json({ success: false, message: 'Missing auth token' });
    }
    
    
    const videoCheck = checkVideoFile();
    if (!videoCheck.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not available',
        details: videoCheck.error
      });
    }
    
    
    for (const [existingToken, data] of videoTokens.entries()) {
      if (data.authToken === authToken && Date.now() < data.expires) {
        return res.json({ token: existingToken });
      }
    }
    
    
    const token = generateVideoToken(authToken);
    res.json({ token });
  });

  
  app.get('/api/video-stream', (req, res) => {
    const token = req.query.token as string;
    if (!token || !validateVideoToken(token)) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    
    
    const videoCheck = checkVideoFile();
    if (!videoCheck.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not available',
        details: videoCheck.error
      });
    }
    
    const videoPath = getVideoPath();
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      
      file.pipe(res);
    } else {
      
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      
      fs.createReadStream(videoPath).pipe(res);
    }
  });

  
  app.get('/api/session', (req, res) => {
    const authToken = req.headers.authorization?.split(' ')[1];
    res.json({ authenticated: authToken ? validateAuthToken(authToken) : false });
  });

  
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  
  app.use(vite.middlewares);

  
  app.use(express.static(path.resolve(__dirname, 'dist')));

  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.resolve(__dirname, 'index.html'));
  });

  
  console.log('Registered routes:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer().catch((err) => {
  console.error(err);
  process.exit(1);
}); 