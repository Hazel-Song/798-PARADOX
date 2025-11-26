'use client';

import { useState, useEffect, useRef } from 'react';
import { CommentTag } from './CommentTags';

interface DebateRound {
  artist: string;
  government: string;
}

// 5组预设对话：关于798艺术区展览主题 + 艺术自由vs政府管控
const DEBATE_PRESETS: DebateRound[] = [
  {
    artist: "Our exhibition explores the tension between urban development and artistic preservation. 798 is a living archive of resistance.",
    government: "Exhibitions must promote positive energy and harmonious development narratives. Individual memory cannot override collective progress."
  },
  {
    artist: "Art should document the authentic experience of displacement, even if it's uncomfortable. That's our responsibility.",
    government: "Cultural production serves the nation's development goals. Nostalgia for industrial ruins is counterproductive to modernization."
  },
  {
    artist: "We're creating a space for dialogue about what we've lost. The demolished factories held decades of worker memories.",
    government: "The 798 brand has successfully integrated into the city's cultural economy. This is the correct path forward."
  },
  {
    artist: "But who controls the narrative? Artists or administrators? Freedom means the right to critique the transformation itself.",
    government: "Freedom exists within the framework of socialist core values. Exhibition content must align with guidance principles."
  },
  {
    artist: "Then we're not free artists—we're cultural workers following a script. 798 has become a stage set, not a living community.",
    government: "Economic vitality and cultural management are not contradictory. Controlled openness ensures sustainable development."
  }
];

interface Period3DebateProps {
  protestTags: CommentTag[];
  currentPeriod: string;
  canvasWidth: number;
  canvasHeight: number;
}

export default function Period3Debate({
  protestTags,
  currentPeriod,
  canvasWidth,
  canvasHeight
}: Period3DebateProps) {
  const [selectedTag, setSelectedTag] = useState<CommentTag | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [artistText, setArtistText] = useState('');
  const [govText, setGovText] = useState('');
  const [isTypingArtist, setIsTypingArtist] = useState(false);
  const [isTypingGov, setIsTypingGov] = useState(false);

  const artistIndexRef = useRef(0);
  const govIndexRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // 每次进入 period-3 时随机选择一个 protest tag
  useEffect(() => {
    if (currentPeriod === '2006–2010' && protestTags.length > 0 && !selectedTag) {
      const randomIndex = Math.floor(Math.random() * protestTags.length);
      const selected = protestTags[randomIndex];
      setSelectedTag(selected);
      console.log('🎭 Selected protest tag for debate:', selected.id);

      // 开始第一轮对话
      startRound(0);
    }

    // 离开 period-3 时清理
    if (currentPeriod !== '2006–2010') {
      setSelectedTag(null);
      setCurrentRound(0);
      setArtistText('');
      setGovText('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [currentPeriod, protestTags, selectedTag]);

  // 开始新一轮对话
  const startRound = (roundIndex: number) => {
    // 清除任何现有的定时器，防止竞态条件
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const round = DEBATE_PRESETS[roundIndex];

    // 重置状态
    setArtistText('');
    setGovText('');
    artistIndexRef.current = 0;
    govIndexRef.current = 0;

    console.log(`🎭 Starting debate round ${roundIndex + 1}/5`);

    // 开始 Artist 打字
    setIsTypingArtist(true);
    typeArtistText(round.artist, roundIndex);
  };

  // Artist 打字机效果
  const typeArtistText = (fullText: string, roundIndex: number) => {
    if (artistIndexRef.current < fullText.length) {
      if (artistIndexRef.current === 0) {
        // 第一个字符直接设置，不追加，避免状态更新异步问题
        setArtistText(fullText[0]);
      } else {
        // 后续字符追加
        setArtistText(prev => prev + fullText[artistIndexRef.current]);
      }
      artistIndexRef.current++;

      typingTimeoutRef.current = setTimeout(() => {
        typeArtistText(fullText, roundIndex);
      }, 50); // 50ms per character
    } else {
      setIsTypingArtist(false);
      console.log('✅ Artist finished typing');

      // Artist 完成后延迟 1s 开始 Government 打字
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingGov(true);
        const round = DEBATE_PRESETS[roundIndex];
        typeGovText(round.government, roundIndex);
      }, 1000);
    }
  };

  // Government 打字机效果
  const typeGovText = (fullText: string, roundIndex: number) => {
    if (govIndexRef.current < fullText.length) {
      if (govIndexRef.current === 0) {
        // 第一个字符直接设置，不追加，避免状态更新异步问题
        setGovText(fullText[0]);
      } else {
        // 后续字符追加
        setGovText(prev => prev + fullText[govIndexRef.current]);
      }
      govIndexRef.current++;

      typingTimeoutRef.current = setTimeout(() => {
        typeGovText(fullText, roundIndex);
      }, 50); // 50ms per character
    } else {
      setIsTypingGov(false);
      console.log('✅ Government finished typing');

      // Government 完成后延迟 2s 开始下一轮
      typingTimeoutRef.current = setTimeout(() => {
        const nextRound = (roundIndex + 1) % DEBATE_PRESETS.length;
        setCurrentRound(nextRound);
        startRound(nextRound);
      }, 2000);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // 不显示（不在 period-3 或没有选中的 tag）
  if (currentPeriod !== '2006–2010' || !selectedTag) {
    return null;
  }

  // 计算位置：圆心下方 80px，左侧 60px
  const baseX = selectedTag.position.x - 60;
  const baseY = selectedTag.position.y + 80;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 70 }}>
      {/* Artist 固定点 */}
      <div
        className="absolute rounded-full"
        style={{
          left: `${baseX}px`,
          top: `${baseY}px`,
          width: '8px',
          height: '8px',
          backgroundColor: '#F328A5',
          boxShadow: '0 0 10px 2px rgba(243, 40, 165, 0.8)',
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Artist 文本框 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: `${baseX + 15}px`,
          top: `${baseY - 20}px`,
          minWidth: '180px',
          maxWidth: '240px',
          padding: '6px 8px',
          border: '1px solid #FFFFFF',
          background: 'linear-gradient(to right, #F328A5, rgba(118, 113, 116, 0.8))',
          color: '#000000',
          fontFamily: 'monospace',
          fontSize: '9px',
          lineHeight: '1.4',
          boxShadow: '0 2px 8px rgba(243, 40, 165, 0.2)'
        }}
      >
        <div style={{ marginBottom: '2px', fontWeight: 'bold', fontSize: '8px' }}>
          ARTIST
        </div>
        {artistText}
        {isTypingArtist && <span className="animate-pulse">|</span>}
      </div>

      {/* Government 固定点 */}
      <div
        className="absolute rounded-full"
        style={{
          left: `${baseX}px`,
          top: `${baseY + 50}px`,
          width: '8px',
          height: '8px',
          backgroundColor: '#DA120B',
          boxShadow: '0 0 10px 2px rgba(218, 18, 11, 0.8)',
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Government 文本框 - 放在点的下方 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: `${baseX + 15}px`,
          top: `${baseY + 60}px`,
          minWidth: '180px',
          maxWidth: '240px',
          padding: '6px 8px',
          border: '1px solid #000000',
          background: 'linear-gradient(to right, #D5090C, #000000)',
          color: '#FFFFFF',
          fontFamily: 'monospace',
          fontSize: '9px',
          lineHeight: '1.4',
          boxShadow: '0 2px 8px rgba(213, 9, 12, 0.2)'
        }}
      >
        <div style={{ marginBottom: '2px', fontWeight: 'bold', fontSize: '8px', color: '#FFFFFF' }}>
          REGULATOR
        </div>
        {govText}
        {isTypingGov && <span className="animate-pulse">|</span>}
      </div>
    </div>
  );
}
