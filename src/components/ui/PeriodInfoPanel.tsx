'use client';

import React from 'react';
import { TimePeriod } from '@/types';

interface PeriodInfoPanelProps {
  currentPeriod?: TimePeriod;
  className?: string;
}

const PeriodInfoPanel: React.FC<PeriodInfoPanelProps> = ({
  currentPeriod,
  className = ''
}) => {
  if (!currentPeriod) {
    return (
      <div className={`${className}`}>
        <div className="text-white/50 text-xs">
          Select a period to view details
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 时期标题 */}
      <div className="mb-4 flex justify-between items-start">
        <h4 className="text-sm font-mono text-yellow-400 mb-3 flex-1">
          {currentPeriod.name}
        </h4>
        <div className="text-xs font-mono text-white/60 ml-4">
          {currentPeriod.years}
        </div>
      </div>

      {/* 描述文本 */}
      <div className="space-y-2">
        <div className="text-xs leading-snug text-white/90 font-mono">
          {currentPeriod.description}
        </div>
      </div>
    </div>
  );
};

export default PeriodInfoPanel;