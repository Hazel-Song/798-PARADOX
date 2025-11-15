'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface GenerateFormProps {
  onGenerate: (prompt: string, type: 'image' | 'text', provider?: string) => Promise<void>;
  loading?: boolean;
}

export default function GenerateForm({ onGenerate, loading = false }: GenerateFormProps) {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'image' | 'text'>('image');
  const [provider, setProvider] = useState<string>('fal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      await onGenerate(prompt, type, provider);
      setPrompt('');
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-2">
        <label className="text-white font-medium">生成类型</label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setType('image')}
            className={`px-4 py-2 rounded-md transition-colors ${
              type === 'image'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            图片
          </button>
          <button
            type="button"
            onClick={() => setType('text')}
            className={`px-4 py-2 rounded-md transition-colors ${
              type === 'text'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            文本
          </button>
        </div>
      </div>

      {type === 'image' && (
        <div className="space-y-2">
          <label className="text-white font-medium">图片生成服务</label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setProvider('fal')}
              className={`px-4 py-2 rounded-md transition-colors ${
                provider === 'fal'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              FAL AI (Flux Pro)
            </button>
            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`px-4 py-2 rounded-md transition-colors ${
                provider === 'openai'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              DALL-E 3
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="prompt" className="text-white font-medium">
          创作提示词
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`输入${type === 'image' ? '图片' : '文本'}生成提示词...`}
          className="w-full p-3 rounded-md bg-white/20 text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={loading}
        />
      </div>

      <motion.button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
      >
        {loading ? '生成中...' : `生成${type === 'image' ? '图片' : '文本'}`}
      </motion.button>
    </motion.form>
  );
}