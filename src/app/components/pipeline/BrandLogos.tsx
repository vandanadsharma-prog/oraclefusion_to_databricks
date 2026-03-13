import React from 'react';
import type { NodeType } from '../../types/pipeline';

interface LogoProps {
  size?: number;
  className?: string;
}

/** Oracle "O" ring logo — brand color #C74634 */
export function OracleLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fill="#C74634"
        d="M11.997 0C5.373 0 0 5.372 0 11.997 0 18.621 5.373 24 11.997 24c6.625 0 12.003-5.379 12.003-12.003C24.0 5.372 18.622 0 11.997 0zm0 4.87c3.938 0 7.127 3.189 7.127 7.127s-3.189 7.127-7.127 7.127c-3.938 0-7.127-3.189-7.127-7.127S8.059 4.87 11.997 4.87z"
      />
    </svg>
  );
}

/** Oracle GoldenGate — Oracle logo with a gold ring accent */
export function GoldenGateLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fill="#C87D00"
        d="M11.997 0C5.373 0 0 5.372 0 11.997 0 18.621 5.373 24 11.997 24c6.625 0 12.003-5.379 12.003-12.003C24.0 5.372 18.622 0 11.997 0zm0 4.87c3.938 0 7.127 3.189 7.127 7.127s-3.189 7.127-7.127 7.127c-3.938 0-7.127-3.189-7.127-7.127S8.059 4.87 11.997 4.87z"
      />
      <path
        fill="#E8AB00"
        d="M12 7.5c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5S14.485 7.5 12 7.5zm0 1.5c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"
      />
    </svg>
  );
}

/** Databricks delta / spark logo — brand color #FF3621 */
export function DatabricksLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fill="#FF3621"
        d="M0 13.318v3.75l12 6.932 12-6.932v-3.75L12 20.25 0 13.318zm0-3.75 12 6.932 12-6.932V9.818L12 16.75 0 9.818v-.25zm12-9.818L0 6.068v3.75l12-6.75 12 6.75V6.068L12 0z"
      />
    </svg>
  );
}

/** Microsoft Azure logo — brand color #0078D4 */
export function AzureLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fill="#0078D4"
        d="M5.483 21.3H.027L5.53 6.25l3.503 6.06-3.55 9zm.978-2.46 3.3-5.6 9.98 6.04L5.483 21.3l.978-2.46zM13.116 0l5.54 9.44-9.98.56 6.24-4.53L13.116 0zm3.74 10.09 3.16 1.85.7 1.2L9.98 12.53l6.876-2.44z"
      />
    </svg>
  );
}

/** Java coffee cup logo — brand color #ED8B00 */
export function JavaLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cup body */}
      <path
        fill="#ED8B00"
        d="M7 6h10l-1 9H8L7 6zm1.5 1.5v6h7v-6h-7z"
      />
      {/* Handle */}
      <path
        fill="#ED8B00"
        d="M17 8.5h1.5a1.5 1.5 0 0 1 0 3H17"
        stroke="#ED8B00"
        strokeWidth="1"
      />
      {/* Saucer */}
      <rect fill="#ED8B00" x="6" y="15.5" width="12" height="1.5" rx="0.5" />
      {/* Steam wisps */}
      <path
        stroke="#ED8B00"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        d="M9.5 4.5 C9.5 3.5 10.5 3.5 10.5 2.5"
      />
      <path
        stroke="#ED8B00"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        d="M12 4.5 C12 3.5 13 3.5 13 2.5"
      />
    </svg>
  );
}

/** Generic API / REST icon */
export function RestApiLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="3" rx="1.5" fill="#16A34A" />
      <rect x="2" y="11" width="14" height="3" rx="1.5" fill="#16A34A" opacity="0.7" />
      <rect x="2" y="16" width="17" height="3" rx="1.5" fill="#16A34A" opacity="0.45" />
    </svg>
  );
}

/** BICC / Business Intelligence Connector icon */
export function BiccLogo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#1E88E5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#1E88E5" opacity="0.6" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#1E88E5" opacity="0.6" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#1E88E5" opacity="0.35" />
    </svg>
  );
}

export const BRAND_LOGOS: Record<NodeType, React.ComponentType<LogoProps>> = {
  'oracle-fusion': OracleLogo,
  bicc: BiccLogo,
  goldengate: GoldenGateLogo,
  'rest-api': RestApiLogo,
  jdbc: JavaLogo,
  'cloud-storage': AzureLogo,
  databricks: DatabricksLogo,
};
