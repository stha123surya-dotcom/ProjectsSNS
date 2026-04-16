import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const projectsDir = path.join(process.cwd(), 'public', 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  const defaultFolders = [
    'Residential Projects',
    'Academic Buildings Projects',
    'Hospital Projects',
    'Office - Industry Projects',
    'Hospitality Projects'
  ];

  defaultFolders.forEach(folderName => {
    const dir = path.join(projectsDir, folderName);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  app.get('/api/folders', (req, res) => {
    try {
      const folders = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const folderPath = path.join(projectsDir, dirent.name);
          
          let description = '';
          const metaPath = path.join(folderPath, 'meta.json');
          if (fs.existsSync(metaPath)) {
            try { description = JSON.parse(fs.readFileSync(metaPath, 'utf-8')).description || ''; } catch (e) {}
          }

          let projects = [];
          const projectsPath = path.join(folderPath, 'projects.json');
          if (fs.existsSync(projectsPath)) {
            try { projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8')); } catch (e) {}
          }

          return {
            id: dirent.name,
            name: dirent.name,
            thumbnailUrl: projects.length > 0 ? projects[0].url : null,
            imageCount: projects.length,
            description
          };
        });
      res.json({ folders });
    } catch (error) {
      console.error('Error reading folders:', error);
      res.status(500).json({ error: 'Failed to load folders' });
    }
  });

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
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  app.get('/api/folders/:folderName/images', (req, res) => {
    try {
      const folderName = req.params.folderName;
      const folderPath = path.join(projectsDir, folderName);
      
      if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      let projects = [];
      const projectsPath = path.join(folderPath, 'projects.json');
      if (fs.existsSync(projectsPath)) {
        try { projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8')); } catch (e) {}
      }

      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  app.post('/api/folders/:folderName/images', (req, res) => {
    try {
      const { url, title, description } = req.body;
      if (!url) return res.status(400).json({ error: 'Image URL is required' });

      const folderName = req.params.folderName;
      const folderPath = path.join(projectsDir, folderName);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      const projectsPath = path.join(folderPath, 'projects.json');
      let projects: any[] = [];
      if (fs.existsSync(projectsPath)) {
        try { projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8')); } catch (e) {}
      }

      const newProject = {
        id: Date.now().toString(),
        title: title || 'Untitled',
        filename: Date.now().toString(),
        url,
        description: description || '',
        folder: folderName
      };

      projects.push(newProject);
      fs.writeFileSync(projectsPath, JSON.stringify(projects));

      res.json({ success: true, project: newProject });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add image' });
    }
  });

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
      res.status(500).json({ error: 'Failed to update folder' });
    }
  });

  app.put('/api/folders/:folderName/images/:id', (req, res) => {
    try {
      const { folderName, id } = req.params;
      const { title, description } = req.body;
      const projectsPath = path.join(projectsDir, folderName, 'projects.json');
      
      if (fs.existsSync(projectsPath)) {
        let projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
        const idx = projects.findIndex((p: any) => p.id === id);
        if (idx !== -1) {
          projects[idx] = { ...projects[idx], title, description };
          fs.writeFileSync(projectsPath, JSON.stringify(projects));
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update image metadata' });
    }
  });

  app.delete('/api/folders/:folderName/images/:id', (req, res) => {
    try {
      const { folderName, id } = req.params;
      const projectsPath = path.join(projectsDir, folderName, 'projects.json');
      
      if (fs.existsSync(projectsPath)) {
        let projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
        projects = projects.filter((p: any) => p.id !== id);
        fs.writeFileSync(projectsPath, JSON.stringify(projects));
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
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
