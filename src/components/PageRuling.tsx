import React from 'react';
import { RulingType } from '../types/notebook';

interface PageRulingProps {
  ruling: RulingType;
  width: number;
  height: number;
  isDarkMode?: boolean;
}

export const PageRuling: React.FC<PageRulingProps> = ({
  ruling,
  width,
  height,
  isDarkMode = false,
}) => {
  const paperBg = isDarkMode ? '#1e293b' : '#fafaf9';
  const gridColor = isDarkMode ? '#334155' : '#cbd5e1';
  const mainLineColor = isDarkMode ? '#475569' : '#94a3b8';
  const marginRed = isDarkMode ? '#f87171' : '#ef4444';
  const dotColor = isDarkMode ? '#475569' : '#94a3b8';

  const renderRulingContent = () => {
    switch (ruling) {
      case 'kariert': {
        // 5mm grid (~20px)
        const step = 20;
        return (
          <>
            <defs>
              <pattern id="grid-5mm" width={step} height={step} patternUnits="userSpaceOnUse">
                <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke={gridColor} strokeWidth="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-5mm)" />
            {/* Teacher's correction margin line (standard right margin ~120px) */}
            <line x1={width - 120} y1="0" x2={width - 120} y2={height} stroke={marginRed} strokeWidth="1" strokeOpacity="0.75" />
          </>
        );
      }

      case 'kariert_gross': {
        // 7mm grid (~28px)
        const step = 28;
        return (
          <>
            <defs>
              <pattern id="grid-7mm" width={step} height={step} patternUnits="userSpaceOnUse">
                <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke={gridColor} strokeWidth="0.9" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-7mm)" />
            <line x1={width - 120} y1="0" x2={width - 120} y2={height} stroke={marginRed} strokeWidth="1" strokeOpacity="0.75" />
          </>
        );
      }

      case 'liniert_rand': {
        // Lines ~26px with red margin
        const lineSpacing = 28;
        const lines = [];
        for (let y = 60; y < height - 40; y += lineSpacing) {
          lines.push(<line key={y} x1="60" y1={y} x2={width - 60} y2={y} stroke={mainLineColor} strokeWidth="1" strokeOpacity="0.7" />);
        }
        return (
          <>
            {lines}
            {/* Red margin line at x=140 */}
            <line x1="140" y1="0" x2="140" y2={height} stroke={marginRed} strokeWidth="1.2" strokeOpacity="0.8" />
          </>
        );
      }

      case 'liniert': {
        const lineSpacing = 28;
        const lines = [];
        for (let y = 60; y < height - 40; y += lineSpacing) {
          lines.push(<line key={y} x1="60" y1={y} x2={width - 60} y2={y} stroke={mainLineColor} strokeWidth="1" strokeOpacity="0.7" />);
        }
        return <>{lines}</>;
      }

      case 'punkte': {
        // 5mm dot grid (~20px)
        const step = 20;
        return (
          <>
            <defs>
              <pattern id="dot-grid" width={step} height={step} patternUnits="userSpaceOnUse">
                <circle cx={step / 2} cy={step / 2} r="1" fill={dotColor} fillOpacity="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </>
        );
      }

      case 'vokabeln': {
        // 2 Columns with center line and horizontal rows
        const lineSpacing = 32;
        const lines = [];
        for (let y = 70; y < height - 40; y += lineSpacing) {
          lines.push(<line key={y} x1="60" y1={y} x2={width - 60} y2={y} stroke={gridColor} strokeWidth="0.8" />);
        }
        const midX = width / 2;
        return (
          <>
            {lines}
            {/* Center double divider */}
            <line x1={midX - 1.5} y1="40" x2={midX - 1.5} y2={height - 30} stroke={mainLineColor} strokeWidth="1.2" />
            <line x1={midX + 1.5} y1="40" x2={midX + 1.5} y2={height - 30} stroke={mainLineColor} strokeWidth="1.2" />
          </>
        );
      }

      case 'noten': {
        // 5-line music staves
        const staveGroups = [];
        const staveSpacing = 8;
        const groupSpacing = 70;
        let y = 70;
        while (y + 4 * staveSpacing < height - 40) {
          const lines = [];
          for (let i = 0; i < 5; i++) {
            lines.push(
              <line
                key={i}
                x1="60"
                y1={y + i * staveSpacing}
                x2={width - 60}
                y2={y + i * staveSpacing}
                stroke={mainLineColor}
                strokeWidth="1"
              />
            );
          }
          staveGroups.push(<g key={y}>{lines}</g>);
          y += 4 * staveSpacing + groupSpacing;
        }
        return <>{staveGroups}</>;
      }

      case 'blanko':
      default:
        return null;
    }
  };

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none transition-colors duration-200"
      style={{ backgroundColor: paperBg }}
    >
      {/* Paper page shadow effect border */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill="none"
        stroke={isDarkMode ? '#334155' : '#e2e8f0'}
        strokeWidth="1"
      />
      {renderRulingContent()}
    </svg>
  );
};
