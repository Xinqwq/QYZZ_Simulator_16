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

const HackerConfigPanel = () => {
  const { blockVisibility, toggleBlockVisibility } = useConfig();
  const [moonlightEnabled, setMoonlightEnabled] = useState(true);

  // 月光开关处理函数
  const handleMoonlightToggle = (enabled) => {
    setMoonlightEnabled(enabled);
  };

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
      visible: blockVisibility.multiplier,
      moonlightControlled: true // 标记为月光控制
    },
    {
      id: 'triggers',
      title: '触发次数设置',
      component: TriggerConfig,
      visible: blockVisibility.triggers,
      moonlightControlled: true // 标记为月光控制
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
      {/* 月光开关控制面板 */}
      <div className="moonlight-control-panel">
        <div className="moonlight-toggle-section">
          <div className="toggle-container">
            <label className="toggle-label">月光功能</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={moonlightEnabled}
                onChange={(e) => handleMoonlightToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{moonlightEnabled ? '开启' : '关闭'}</span>
            </label>
          </div>
          <div className="moonlight-description">
            {moonlightEnabled ? '月光相关功能已开启，可正常使用月光番数和触发次数' : '月光功能已关闭，月光相关配置将被隐藏'}
          </div>
        </div>
      </div>

      {/* 配置块列表 */}
      {blocks.map(block => {
        // 如果月光功能关闭且该块受月光控制，则隐藏
        const shouldShow = moonlightEnabled || !block.moonlightControlled;
        
        if (!shouldShow) return null;

        return (
          <CollapsibleBlock
            key={block.id}
            title={block.title}
            isVisible={block.visible}
            onToggle={() => toggleBlockVisibility(block.id)}
          >
            <block.component />
          </CollapsibleBlock>
        );
      })}
    </div>
  );
};

export default HackerConfigPanel;

