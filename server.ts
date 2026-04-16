import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadImage = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          const file = fs.createWriteStream(dest);
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ensure public/projects directory exists
  const projectsDir = path.join(process.cwd(), 'public', 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  // Create default requested folders
  const defaultFolders = [
    'Residential Projects',
    'Academic Buildings Projects',
    'Hospital Projects',
    'Office / Industry Projects',
    'Hospitality Projects'
  ];

  defaultFolders.forEach(folderName => {
    const dir = path.join(projectsDir, folderName);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Migration: move existing files at root of public/projects to a 'General' folder
  const rootFiles = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(d => d.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(d.name));
  
  if (rootFiles.length > 0) {
    const defaultDir = path.join(projectsDir, 'General');
    if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir);
    rootFiles.forEach(f => {
      fs.renameSync(path.join(projectsDir, f.name), path.join(defaultDir, f.name));
    });
  }

  // Download sample images if directory is completely empty
  const existingEntries = fs.readdirSync(projectsDir);
  if (existingEntries.length === 0) {
    console.log('Downloading sample images into General folder...');
    const defaultDir = path.join(projectsDir, 'General');
    fs.mkdirSync(defaultDir, { recursive: true });
    try {
      await Promise.all([
        downloadImage('https://picsum.photos/seed/architecture/800/600', path.join(defaultDir, '01-Modern-Architecture.jpg')),
        downloadImage('https://picsum.photos/seed/workspace/800/600', path.join(defaultDir, '02-Creative-Workspace.jpg')),
        downloadImage('https://picsum.photos/seed/interior/800/600', path.join(defaultDir, '03-Minimalist-Interior.jpg'))
      ]);
      console.log('Sample images downloaded.');
    } catch (err) {
      console.error('Failed to download sample images:', err);
    }
  }

  // Multer configuration for image uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folderName = req.params.folderName;
      const dir = path.join(projectsDir, folderName);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Keep original name but ensure it's unique enough or just use original
      cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
  });
  const upload = multer({ storage });

  // API route to get all folders
  app.get('/api/folders', (req, res) => {
    try {
      const folders = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const folderPath = path.join(projectsDir, dirent.name);
          const files = fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
          
          let description = '';
          const metaPath = path.join(folderPath, 'meta.json');
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
              description = meta.description || '';
            } catch (e) {}
          }

          return {
            id: dirent.name,
            name: dirent.name,
            thumbnailUrl: files.length > 0 ? `/projects/${encodeURIComponent(dirent.name)}/${encodeURIComponent(files[0])}` : null,
            imageCount: files.length,
            description
          };
        });
      res.json({ folders });
    } catch (error) {
      console.error('Error reading folders:', error);
      res.status(500).json({ error: 'Failed to load folders' });
    }
  });

  // API route to create a folder
  app.post('/api/folders', (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Folder name is required' });
      
      const folderPath = path.join(projectsDir, name);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      
      if (description) {
        fs.writeFileSync(path.join(folderPath, 'meta.json'), JSON.stringify({ description }));
      }
      
      res.json({ success: true, folder: { id: name, name, thumbnailUrl: null, imageCount: 0, description: description || '' } });
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  // API route to get projects in a folder
  app.get('/api/folders/:folderName/images', (req, res) => {
    try {
      const folderName = req.params.folderName;
      const folderPath = path.join(projectsDir, folderName);
      
      if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      let imagesMeta: Record<string, any> = {};
      const metaPath = path.join(folderPath, 'images-meta.json');
      if (fs.existsSync(metaPath)) {
        try { imagesMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch(e){}
      }

      const files = fs.readdirSync(folderPath);
      const projects = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        })
        .map(file => {
          const name = path.parse(file).name;
          const cleanName = name.replace(/^[\d-]+\s*/, '').replace(/[-_]/g, ' ');
          const fileMeta = imagesMeta[file] || {};
          
          return {
            id: file,
            title: fileMeta.title || cleanName,
            filename: file,
            url: `/projects/${encodeURIComponent(folderName)}/${encodeURIComponent(file)}`,
            description: fileMeta.description || `A detailed look into the ${cleanName} project.`,
            folder: folderName
          };
        });

      res.json({ projects });
    } catch (error) {
      console.error('Error reading projects directory:', error);
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  // API route to upload an image to a folder
  app.post('/api/folders/:folderName/images', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    res.json({ success: true, filename: req.file.filename });
  });

  // API route to delete a folder
  app.delete('/api/folders/:folderName', (req, res) => {
    try {
      const folderPath = path.join(projectsDir, req.params.folderName);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  });

  // API route to update a folder
  app.put('/api/folders/:folderName', (req, res) => {
    try {
      const oldName = req.params.folderName;
      const { name, description } = req.body;
      const oldPath = path.join(projectsDir, oldName);
      
      if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Folder not found' });
      
      let currentPath = oldPath;
      if (name && name !== oldName) {
        const newPath = path.join(projectsDir, name);
        if (fs.existsSync(newPath)) return res.status(400).json({ error: 'Folder name already exists' });
        fs.renameSync(oldPath, newPath);
        currentPath = newPath;
      }
      
      if (description !== undefined) {
        fs.writeFileSync(path.join(currentPath, 'meta.json'), JSON.stringify({ description }));
      }
      
      res.json({ success: true, newName: name || oldName });
    } catch (error) {
      console.error('Error updating folder:', error);
      res.status(500).json({ error: 'Failed to update folder' });
    }
  });

  // API route to update an image
  app.put('/api/folders/:folderName/images/:filename', (req, res) => {
    try {
      const { folderName, filename } = req.params;
      const { title, description } = req.body;
      const folderPath = path.join(projectsDir, folderName);
      const metaPath = path.join(folderPath, 'images-meta.json');
      
      let meta: Record<string, any> = {};
      if (fs.existsSync(metaPath)) {
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch(e){}
      }
      
      meta[filename] = { title, description };
      fs.writeFileSync(metaPath, JSON.stringify(meta));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating image metadata:', error);
      res.status(500).json({ error: 'Failed to update image metadata' });
    }
  });

  // API route to delete an image
  app.delete('/api/folders/:folderName/images/:filename', (req, res) => {
    try {
      const imagePath = path.join(projectsDir, req.params.folderName, req.params.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static files from dist
    app.use(express.static(distPath));
    // Serve projects directly from public/projects so newly added images work in production
    app.use('/projects', express.static(projectsDir));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

