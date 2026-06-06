/**
 * KinwoveAppIcon — renders the kinwove app icon as a React component.
 * Matches public/icon-192.svg: parchment (#FAF3E2) rounded square +
 * large centred 4-pointed copper star (#A85530).
 */
import { KinwoveStar } from './KinwoveStar';

export const KinwoveAppIcon = ({ size = 96 }) => {
  const r = Math.round(size * 0.22); // corner radius — matches rx="42" @ 192px
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: '#FAF3E2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `
          0 ${size * 0.08}px ${size * 0.22}px rgba(168,85,48,0.22),
          0 ${size * 0.02}px ${size * 0.07}px rgba(26,17,8,0.10),
          inset 0 1px 0 rgba(255,255,255,0.85)
        `,
        flexShrink: 0,
      }}
      role="img"
      aria-label="kinwove"
    >
      <KinwoveStar size={size * 0.52} color="#A85530" />
    </div>
  );
};
