import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ZoomIn, Folder as FolderIcon, Image as ImageIcon, Plus, Trash2, ArrowLeft, Upload, Edit2 } from 'lucide-react';
import { Project, Folder } from '../types';
import { Lightbox } from './Lightbox';

interface ProjectGalleryProps {
  isAdmin?: boolean;
}

export function ProjectGallery({ isAdmin = false }: ProjectGalleryProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderDesc, setEditFolderDesc] = useState('');

  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'image', id: string } | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  
  const [isAddImageOpen, setIsAddImageOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageTitle, setNewImageTitle] = useState('');
  const [newImageDesc, setNewImageDesc] = useState('');

  const LOCAL_STORAGE_KEY = 'portfolio_data';

  interface StorageData {
    folders: Folder[];
    projects: Record<string, Project[]>;
  }

  const getStorageData = (): StorageData => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse local storage data', e);
    }
    
    // Default data if none exists
    const defaultData: StorageData = {
      folders: [
        { id: 'Residential Projects', name: 'Residential Projects', thumbnailUrl: null, imageCount: 0, description: '' },
        { id: 'Academic Buildings Projects', name: 'Academic Buildings Projects', thumbnailUrl: null, imageCount: 0, description: '' },
        { id: 'Hospital Projects', name: 'Hospital Projects', thumbnailUrl: null, imageCount: 0, description: '' },
        { id: 'Office - Industry Projects', name: 'Office - Industry Projects', thumbnailUrl: null, imageCount: 0, description: '' },
        { id: 'Hospitality Projects', name: 'Hospitality Projects', thumbnailUrl: null, imageCount: 0, description: '' },
      ],
      projects: {}
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultData));
    } catch (e) {}
    return defaultData;
  };

  const saveStorageData = (data: StorageData) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  };

  const fetchFolders = () => {
    const data = getStorageData();
    setFolders(data.folders);
    setLoading(false);
    setError(null);
  };

  const fetchProjects = (folderName: string) => {
    setLoading(true);
    const data = getStorageData();
    setProjects(data.projects[folderName] || []);
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    if (currentFolder) {
      fetchProjects(currentFolder);
    } else {
      fetchFolders();
    }
  }, [currentFolder]);

  const handleCreateFolderClick = () => {
    setNewFolderName('');
    setNewFolderDesc('');
    setIsCreateFolderOpen(true);
  };

  const submitCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const data = getStorageData();
    const newName = newFolderName.trim();
    if (data.folders.some(f => f.name === newName)) {
      alert('Folder already exists');
      return;
    }

    data.folders.push({
      id: newName,
      name: newName,
      thumbnailUrl: null,
      imageCount: 0,
      description: newFolderDesc.trim()
    });
    
    saveStorageData(data);
    setIsCreateFolderOpen(false);
    fetchFolders();
  };

  const handleSaveFolder = (e: React.MouseEvent, oldName: string) => {
    e.stopPropagation();
    const data = getStorageData();
    
    // Check if new name exists and is different
    if (editFolderName !== oldName && data.folders.some(f => f.name === editFolderName)) {
      alert('A folder with this name already exists');
      return;
    }

    const folderIndex = data.folders.findIndex(f => f.name === oldName);
    if (folderIndex !== -1) {
      data.folders[folderIndex] = {
        ...data.folders[folderIndex],
        name: editFolderName,
        description: editFolderDesc,
        id: editFolderName
      };
      
      // Update projects folder reference if name changed
      if (editFolderName !== oldName) {
        data.projects[editFolderName] = data.projects[oldName] || [];
        data.projects[editFolderName].forEach(p => p.folder = editFolderName);
        delete data.projects[oldName];
      }
      
      saveStorageData(data);
    }
    
    setEditingFolder(null);
    fetchFolders();
  };

  const handleSaveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentFolder) return;
    
    const data = getStorageData();
    const folderProjects = data.projects[currentFolder] || [];
    const projectIndex = folderProjects.findIndex(p => p.id === id);
    
    if (projectIndex !== -1) {
      folderProjects[projectIndex] = {
        ...folderProjects[projectIndex],
        title: editProjectTitle,
        description: editProjectDesc
      };
      
      data.projects[currentFolder] = folderProjects;
      saveStorageData(data);
      
      setEditingProject(null);
      fetchProjects(currentFolder);
    }
  };

  const handleDeleteFolderClick = (e: React.MouseEvent, folderName: string) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'folder', id: folderName });
  };

  const handleAddImageClick = () => {
    setNewImageUrl('');
    setNewImageTitle('');
    setNewImageDesc('');
    setIsAddImageOpen(true);
  };

  const submitAddImage = () => {
    if (!newImageUrl.trim() || !currentFolder) return;
    
    const data = getStorageData();
    const newProject: Project = {
      id: Date.now().toString(),
      title: newImageTitle.trim() || 'Untitled',
      filename: Date.now().toString(),
      url: newImageUrl.trim(),
      description: newImageDesc.trim(),
      folder: currentFolder
    };
    
    if (!data.projects[currentFolder]) {
      data.projects[currentFolder] = [];
    }
    data.projects[currentFolder].push(newProject);
    
    // Update folder image count and thumbnail
    const folderIndex = data.folders.findIndex(f => f.name === currentFolder);
    if (folderIndex !== -1) {
      data.folders[folderIndex].imageCount = data.projects[currentFolder].length;
      if (data.projects[currentFolder].length === 1) {
        data.folders[folderIndex].thumbnailUrl = newProject.url;
      }
    }
    
    saveStorageData(data);
    setIsAddImageOpen(false);
    fetchProjects(currentFolder);
  };

  const handleDeleteImageClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'image', id: id });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const data = getStorageData();
    
    if (deleteTarget.type === 'folder') {
      data.folders = data.folders.filter(f => f.name !== deleteTarget.id);
      delete data.projects[deleteTarget.id];
      saveStorageData(data);
      fetchFolders();
    } else if (deleteTarget.type === 'image' && currentFolder) {
      const folderProjects = data.projects[currentFolder] || [];
      data.projects[currentFolder] = folderProjects.filter(p => p.id !== deleteTarget.id);
      
      // Update folder metadata
      const folderIndex = data.folders.findIndex(f => f.name === currentFolder);
      if (folderIndex !== -1) {
        data.folders[folderIndex].imageCount = data.projects[currentFolder].length;
        if (data.projects[currentFolder].length === 0) {
          data.folders[folderIndex].thumbnailUrl = null;
        } else if (data.folders[folderIndex].thumbnailUrl === folderProjects.find(p => p.id === deleteTarget.id)?.url) {
           data.folders[folderIndex].thumbnailUrl = data.projects[currentFolder][0].url;
        }
      }
      
      saveStorageData(data);
      fetchProjects(currentFolder);
    }
    setDeleteTarget(null);
  };

  if (loading && folders.length === 0 && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentFolder && (
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => setCurrentFolder(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Back to Folders
          </button>
          <h2 className="text-2xl font-light">{currentFolder}</h2>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {!currentFolder ? (
          // FOLDERS VIEW
          <>
            {folders
              .filter(folder => isAdmin || folder.imageCount > 0)
              .map((folder, index) => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                className="group cursor-pointer flex flex-col"
                onClick={() => setCurrentFolder(folder.name)}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 mb-4 border border-zinc-200 flex items-center justify-center">
                  {folder.thumbnailUrl ? (
                    <img
                      src={folder.thumbnailUrl}
                      alt={folder.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <FolderIcon size={48} className="text-zinc-300" />
                  )}
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteFolderClick(e, folder.name)}
                      className="absolute top-4 right-4 p-2 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm"
                      title="Delete Folder"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {editingFolder === folder.name ? (
                  <div className="px-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={editFolderName} 
                      onChange={e => setEditFolderName(e.target.value)}
                      className="w-full px-2 py-1 text-xl font-bold text-zinc-900 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <textarea 
                      value={editFolderDesc} 
                      onChange={e => setEditFolderDesc(e.target.value)}
                      className="w-full px-2 py-1 text-sm font-normal text-zinc-700 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => handleSaveFolder(e, folder.name)} className="flex-1 bg-blue-600 text-white py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors">Save</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingFolder(null); }} className="flex-1 bg-zinc-200 text-zinc-700 py-1 rounded text-sm font-medium hover:bg-zinc-300 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-1 flex justify-between items-start group/text">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-zinc-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {folder.name}
                      </h3>
                      {folder.description && (
                        <p className="text-sm font-normal text-zinc-500 mb-1">
                          {folder.description}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400">
                        {folder.imageCount} {folder.imageCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder.name);
                          setEditFolderName(folder.name);
                          setEditFolderDesc(folder.description || '');
                        }}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/text:opacity-100 transition-all"
                        title="Edit Folder"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
            
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group cursor-pointer flex flex-col"
                onClick={handleCreateFolderClick}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-50 mb-4 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center transition-colors group-hover:border-zinc-400 group-hover:bg-zinc-100">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-zinc-400 group-hover:text-zinc-600 transition-colors">
                    <Plus size={24} />
                  </div>
                  <span className="font-medium text-zinc-500 group-hover:text-zinc-700">Create Folder</span>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          // IMAGES VIEW
          <>
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                className="group cursor-pointer flex flex-col"
                onClick={() => setSelectedProject(project)}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 mb-4">
                  <img
                    src={project.url}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white/90 backdrop-blur-sm text-zinc-900 p-3 rounded-full shadow-lg">
                      <ZoomIn size={20} />
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteImageClick(e, project.id)}
                      className="absolute top-4 right-4 p-2 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm z-10"
                      title="Delete Image"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                {editingProject === project.id ? (
                  <div className="px-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={editProjectTitle} 
                      onChange={e => setEditProjectTitle(e.target.value)}
                      className="w-full px-2 py-1 text-lg font-medium text-zinc-900 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <textarea 
                      value={editProjectDesc} 
                      onChange={e => setEditProjectDesc(e.target.value)}
                      className="w-full px-2 py-1 text-sm font-normal text-zinc-700 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => handleSaveProject(e, project.id)} className="flex-1 bg-blue-600 text-white py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors">Save</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingProject(null); }} className="flex-1 bg-zinc-200 text-zinc-700 py-1 rounded text-sm font-medium hover:bg-zinc-300 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-1 flex justify-between items-start group/text">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-zinc-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-zinc-500 line-clamp-2">
                        {project.description}
                      </p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project.id);
                          setEditProjectTitle(project.title);
                          setEditProjectDesc(project.description);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/text:opacity-100 transition-all"
                        title="Edit Image Details"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group cursor-pointer flex flex-col"
                onClick={handleAddImageClick}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-50 mb-4 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center transition-colors group-hover:border-zinc-400 group-hover:bg-zinc-100">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-zinc-400 group-hover:text-zinc-600 transition-colors">
                    <Upload size={24} />
                  </div>
                  <span className="font-medium text-zinc-500 group-hover:text-zinc-700">Add Image URL</span>
                </div>
              </motion.div>
            )}
            
            {projects.length === 0 && !isAdmin && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 mb-1">No images yet</h3>
                <p className="text-zinc-500">This folder is currently empty.</p>
              </div>
            )}
          </>
        )}
      </div>

      <Lightbox
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirm Deletion</h3>
            <p className="text-zinc-600 mb-6">
              Are you sure you want to delete this {deleteTarget.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Create New Folder</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Folder Name *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description (Optional)</label>
                <textarea
                  value={newFolderDesc}
                  onChange={e => setNewFolderDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCreateFolderOpen(false)}
                className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Image Modal */}
      {isAddImageOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Add Image via URL</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Image URL *</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={newImageTitle}
                  onChange={e => setNewImageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description (Optional)</label>
                <textarea
                  value={newImageDesc}
                  onChange={e => setNewImageDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddImageOpen(false)}
                className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAddImage}
                disabled={!newImageUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add Image
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
