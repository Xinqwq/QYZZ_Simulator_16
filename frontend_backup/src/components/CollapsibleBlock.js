import React, { useState } from 'react';
import './CollapsibleBlock.css';

const CollapsibleBlock = ({ title, children, isVisible = true, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (onToggle) {
      onToggle();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="collapsible">
      <div className="collapsible-header" onClick={handleToggle}>
        <h4 className="collapsible-title">{title}</h4>
        <span className={`collapsible-toggle ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleBlock;
