import { ProjectGallery } from './components/ProjectGallery';

export default function App() {
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
      </header>

      <main className="px-6 md:px-12 pb-24 max-w-7xl mx-auto">
        <ProjectGallery isAdmin={true} />
      </main>
    </div>
  );
}
