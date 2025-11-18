'use client';

import React from 'react';
import { PeriodRoles } from '@/types';

interface RolePanelProps {
  roles: PeriodRoles;
  className?: string;
  currentKeywords?: string[]; // 新增：当前观察的关键词
  governmentInputs?: string[]; // 新增：政府输入文本框内容（最多3个）
}

const RolePanel: React.FC<RolePanelProps> = ({
  roles,
  className = '',
  currentKeywords = [],
  governmentInputs = [] // 新增默认值
}) => {
  const roleKeys = ['artist', 'government', 'visitor'] as const;
  const availableRoles = roleKeys.filter(key => roles[key]);

  if (availableRoles.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-white/50 text-xs">
          No role information for this period
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {availableRoles.map((roleKey) => {
        const role = roles[roleKey]!;

        return (
          <div key={roleKey} className="">
            {/* 角色名称 */}
            <div className="mb-2">
              <h4 className="text-sm font-mono text-white uppercase tracking-wider">
                {role.name}
              </h4>
            </div>

            {/* 角色描述 */}
            <div className="space-y-2">
              <p className="text-xs font-mono leading-snug text-white/80">
                {role.description}
              </p>

              {/* 行动列表 */}
              {role.actions.length > 0 && (
                <div className="space-y-1">
                  {role.actions.map((action, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      {/* 图标占位符 */}
                      <div className="w-1.5 h-1.5 mt-1 bg-white/30 rounded-sm flex-shrink-0"></div>

                      {/* 行动描述 */}
                      <span className="text-[10px] font-mono text-white/70 leading-tight">
                        {action}
                        {/* 如果是 intuition and imagination 且是艺术家角色，总是显示观察区域 */}
                        {roleKey === 'artist' && action === 'intuition and imagination' && (
                          <span className="ml-2">
                            {currentKeywords.length > 0 ? (
                              currentKeywords.slice(0, 3).map((keyword, kwIndex) => (
                                <span
                                  key={kwIndex}
                                  className="text-[10px] font-mono px-1 py-0.5 bg-white/10 border border-white/20 text-white/70 ml-1"
                                >
                                  [{keyword}]
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-mono text-white/40 ml-2">
                                [observing...]
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}

                  {/* 政府角色：在 assess and demolish 下方显示3个输入文本框 */}
                  {roleKey === 'government' && (
                    <div className="mt-2 space-y-1">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-sm flex-shrink-0"></div>
                          <div className="text-[10px] font-mono px-1 py-0.5 bg-white/10 border border-white/20 text-white/70 min-h-[16px] flex-1">
                            {governmentInputs[index] || ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 移除原来的单独关键词区域 */}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RolePanel;