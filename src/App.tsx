/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ProjectGallery } from './components/ProjectGallery';
import { Lock, Unlock } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAILS = ['stha123surya@gmail.com', 'shapeandstructure@gmail.com'];

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdminToggle = async () => {
    if (isAdmin) {
      try {
        await signOut(auth);
        setIsAdmin(false);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    } else {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const email = result.user.email;
        
        if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
          setIsAdmin(true);
        } else {
          await signOut(auth);
          alert('Unauthorized email address. You do not have admin access.');
        }
      } catch (error) {
        console.error('Error signing in:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="pt-20 pb-16 px-6 md:px-12 max-w-7xl mx-auto flex justify-between items-start">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6">
            Selected Works
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 font-light leading-relaxed">
            A collection of our recent projects organized by category.
          </p>
        </div>
        {!authLoading && (
          <button 
            onClick={handleAdminToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${isAdmin ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            {isAdmin ? <Unlock size={16} /> : <Lock size={16} />}
            {isAdmin ? 'Admin Mode' : 'Admin Login'}
          </button>
        )}
      </header>

      <main className="px-6 md:px-12 pb-24 max-w-7xl mx-auto">
        <ProjectGallery isAdmin={isAdmin} />
      </main>
    </div>
  );
}



