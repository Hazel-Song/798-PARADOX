'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AIConfig from '@/components/ui/AIConfig';

const ConfigPage = () => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    type: 'image' | 'text';
    content: string;
    prompt: string;
  } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'image' | 'text'>('image');
  const [provider, setProvider] = useState<string>('fal');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/generate-${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider }),
      });

      const result = await response.json();
      
      if (result.success) {
        setGeneratedContent({
          type,
          content: result.data,
          prompt,
        });
      } else {
        console.error('Generation failed:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const aiData = {
    "AI ARTIST CONFIG": "Configure OpenAI API credentials for the AI artist persona system. The wandering character will use these settings to generate contextual evaluations based on location keywords.",
    "TEXT GENERATION": "Advanced language models process input prompts to generate contextually relevant text responses. The system analyzes semantic patterns and maintains coherence across extended outputs.",
    "IMAGE GENERATION": "Neural networks trained on visual datasets create images from textual descriptions. The process involves latent space manipulation and iterative refinement techniques.",
    "MODEL INTEGRATION": "Multiple AI services operate through unified API endpoints, enabling seamless switching between different generation models and providers for optimal results."
  };

  const currentItems = Object.keys(aiData);

  const handleItemClick = (item: string) => {
    setExpandedItem(expandedItem === item ? null : item);
  };

  return (
    <div 
      className="min-h-screen text-white font-mono relative"
      style={{
        backgroundImage: 'url(/backgrounds/initial_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Header */}
      <header className="p-8 border-b border-white relative z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl leading-tight tracking-wide">
            AI Generation Interface<br />
            <span className="text-lg">Interactive Creation and Analysis Platform</span>
          </h1>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto min-h-[calc(100vh-140px)] relative z-10">
        {/* Left Quarter - Main Content */}
        <div className="w-1/4 p-8 border-r border-white">
          <div className="space-y-4">
            {currentItems.map((item) => (
              <div key={item} className="border border-white">
                <button
                  onClick={() => handleItemClick(item)}
                  className="w-full p-4 text-left border-b border-white hover:bg-white hover:text-black transition-colors uppercase tracking-wider text-sm"
                >
                  {item}
                </button>
                
                <AnimatePresence>
                  {expandedItem === item && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-black border-t border-white">
                        {item === "AI ARTIST CONFIG" ? (
                          <AIConfig />
                        ) : (
                          <p className="leading-relaxed text-xs">
                            {aiData[item as keyof typeof aiData]}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Center Half - AI Generation Interface */}
        <div className="w-1/2 p-8">
          <div className="space-y-6">
            <form onSubmit={handleGenerate} className="border border-white p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-white font-medium text-sm uppercase tracking-widest">TYPE</label>
                <div className="flex space-x-0">
                  <button
                    type="button"
                    onClick={() => setType('image')}
                    className={`px-4 py-2 border transition-colors ${
                      type === 'image'
                        ? 'border-white bg-white text-black'
                        : 'border-white bg-black text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    IMAGE
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('text')}
                    className={`px-4 py-2 border-l-0 border transition-colors ${
                      type === 'text'
                        ? 'border-white bg-white text-black'
                        : 'border-white bg-black text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    TEXT
                  </button>
                </div>
              </div>

              {type === 'image' && (
                <div className="space-y-2">
                  <label className="text-white font-medium text-sm uppercase tracking-widest">PROVIDER</label>
                  <div className="flex space-x-0">
                    <button
                      type="button"
                      onClick={() => setProvider('fal')}
                      className={`px-4 py-2 border transition-colors ${
                        provider === 'fal'
                          ? 'border-white bg-white text-black'
                          : 'border-white bg-black text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      FAL AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('openai')}
                      className={`px-4 py-2 border-l-0 border transition-colors ${
                        provider === 'openai'
                          ? 'border-white bg-white text-black'
                          : 'border-white bg-black text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      DALL-E 3
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="prompt" className="text-white font-medium text-sm uppercase tracking-widest">
                  INPUT
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Enter ${type} generation prompt...`}
                  className="w-full p-3 border border-white bg-black text-white placeholder-gray-500 resize-none focus:outline-none focus:bg-white focus:text-black transition-colors"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-full py-3 border border-white bg-black text-white hover:bg-white hover:text-black transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'GENERATING...' : `GENERATE ${type.toUpperCase()}`}
              </button>
            </form>

            {/* Results */}
            <div className="border border-white p-6">
              <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">OUTPUT</h2>
              
              {loading && (
                <div className="flex items-center justify-center h-64">
                  <div className="border-2 border-white border-t-transparent animate-spin w-8 h-8"></div>
                </div>
              )}
              
              {generatedContent && !loading && (
                <div className="space-y-4">
                  <div className="text-gray-400 text-xs uppercase">
                    Prompt: {generatedContent.prompt}
                  </div>
                  
                  {generatedContent.type === 'image' ? (
                    <img
                      src={generatedContent.content}
                      alt="Generated artwork"
                      className="w-full border border-white"
                    />
                  ) : (
                    <div className="border border-white p-4">
                      <p className="text-white whitespace-pre-wrap text-sm">
                        {generatedContent.content}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {!generatedContent && !loading && (
                <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                  NO OUTPUT GENERATED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Quarter - Rule Box */}
        <div className="w-1/4 p-8">
          <div className="border border-white h-full">
            <div className="p-4 border-b border-white">
              <span className="text-xs uppercase tracking-widest">RULE</span>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm leading-relaxed">
                Support the artists and support the protests—join the march at the subway station.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
