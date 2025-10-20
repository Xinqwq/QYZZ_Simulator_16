import React, { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import CollapsibleBlock from './CollapsibleBlock';
import LevelSelector from './LevelSelector';
import ScoreConfig from './ScoreConfig';
import MultiplierConfig from './MultiplierConfig';
import TriggerConfig from './TriggerConfig';
import DisplayConfig from './DisplayConfig';
import TechConfig from './TechConfig';
import './ConfigPanel.css';

const ConfigPanel = () => {
  const { blockVisibility, toggleBlockVisibility } = useConfig();

  const blocks = [
    {
      id: 'level',
      title: '关卡配置与印章设置',
      component: LevelSelector,
      visible: blockVisibility.level
    },
    {
      id: 'score',
      title: '关卡目标分管理',
      component: ScoreConfig,
      visible: blockVisibility.score
    },
    {
      id: 'multiplier',
      title: '番数与触发配置',
      component: MultiplierConfig,
      visible: blockVisibility.multiplier
    },
    {
      id: 'triggers',
      title: '触发次数设置',
      component: TriggerConfig,
      visible: blockVisibility.triggers
    },
    {
      id: 'display',
      title: '大数字单位系统对照表',
      component: DisplayConfig,
      visible: blockVisibility.display
    },
    {
      id: 'tech',
      title: '魂牌 - 公开牌 - 宝牌指示牌',
      component: TechConfig,
      visible: blockVisibility.tech
    }
  ];

  return (
    <div className="config-panel">
      {blocks.map(block => (
        <CollapsibleBlock
          key={block.id}
          title={block.title}
          isVisible={block.visible}
          onToggle={() => toggleBlockVisibility(block.id)}
        >
          <block.component />
        </CollapsibleBlock>
      ))}
    </div>
  );
};

export default ConfigPanel;
