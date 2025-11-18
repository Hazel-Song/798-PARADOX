'use client';

import React from 'react';
import { TimePeriod } from '@/types';

interface TimelineProps {
  periods: TimePeriod[];
  currentPeriod: string;
  onPeriodChange: (periodId: string) => void;
  className?: string;
  maxUnlockedPeriodIndex?: number; // 新增：最大可解锁的时期索引
}

const Timeline: React.FC<TimelineProps> = ({
  periods,
  currentPeriod,
  onPeriodChange,
  className = '',
  maxUnlockedPeriodIndex = 0 // 默认只解锁第一个时期
}) => {
  // 获取当前时期的索引
  const currentPeriodIndex = periods.findIndex(p => p.id === currentPeriod);

  // 定义连接线条件文本
  const transitionConditions = [
    { text: "区域活力达", value: "50" },
    { text: "舆论热度达", value: "20" },
    { text: "舆论热度达", value: "50" }
  ];

  return (
    <div className={`w-full ${className}`}>
      {/* 时间线容器 */}
      <div className="flex items-center justify-start space-x-2 py-6">
        {periods.map((period, index) => {
          const isLocked = index > maxUnlockedPeriodIndex;
          const isCurrent = currentPeriod === period.id;
          const isPrevious = index < currentPeriodIndex;

          return (
            <div key={period.id} className="flex items-center">
              {/* 时间节点按钮 */}
              <button
                onClick={() => !isLocked && onPeriodChange(period.id)}
                disabled={isLocked}
                className={`flex flex-col items-center transition-opacity cursor-pointer group ${
                  isLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:opacity-80'
                }`}
              >
                {/* 圆点 */}
                <div
                  className={`w-4 h-4 rounded-full transition-colors duration-300 ${
                    isCurrent
                      ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
                      : isLocked
                        ? 'bg-white/20'
                        : 'bg-white/60'
                  }`}
                ></div>

                {/* 年份 */}
                <div className={`text-xs mt-2 font-mono tracking-wide transition-colors duration-300 whitespace-nowrap ${
                  isCurrent
                    ? 'text-yellow-400 font-semibold'
                    : isLocked
                      ? 'text-white/30'
                      : 'text-white/90'
                }`}>
                  {period.years}
                </div>

                {/* 时期名称 */}
                <div className={`text-[10px] mt-1 text-center leading-tight transition-colors duration-300 whitespace-nowrap max-w-none ${
                  isCurrent
                    ? 'text-yellow-300/90 font-medium'
                    : isLocked
                      ? 'text-white/30'
                      : 'text-white/60'
                }`}>
                  {period.name}
                </div>
              </button>

              {/* 连接线和条件文本 */}
              {index < periods.length - 1 && (
                <div className="flex flex-col items-center mx-3">
                  {/* 条件文本 - 移到线的上方，当前时期的条件显示为黄色 */}
                  <div className={`text-[9px] font-mono text-center leading-tight mb-2 whitespace-nowrap transition-colors duration-300 ${
                    isCurrent ? 'text-yellow-400' : 'text-white/50'
                  }`}>
                    {transitionConditions[index].text}
                    <span className={`inline-block mx-1 px-1 py-0.5 rounded transition-colors duration-300 ${
                      isCurrent
                        ? 'bg-yellow-400/20 text-yellow-300'
                        : 'bg-white/20 text-white/80'
                    }`}>
                      {transitionConditions[index].value}
                    </span>
                  </div>

                  {/* 连接线 - 当前时期的连接线显示为黄色 */}
                  <div className={`w-24 h-px transition-colors duration-300 ${
                    isCurrent ? 'bg-yellow-400/60' : 'bg-white/30'
                  }`}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;