import MapLayout from '@/components/ui/MapLayout';

export default function ProceedingPage() {
  return (
    <div className="relative">
      <MapLayout />
      
      {/* Config Button - Bottom Right */}
      <a 
        href="/config"
        className="fixed bottom-4 right-4 w-8 h-8 border border-white/30 text-white/50 hover:border-white hover:text-white transition-colors text-xs flex items-center justify-center font-mono"
        title="Configuration"
      >
        C
      </a>
    </div>
  );
}