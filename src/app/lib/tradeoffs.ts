import type { NodeType } from '../types/pipeline';

export interface TradeoffInfo {
  tool: string;
  layer: string;
  proximityToRawData: string;
  speedLatency: string;
  costFactors: string;
}

// Source: tradeoff-table.csv provided by user (2026-03-13)
export const TRADEOFFS_BY_NODE_TYPE: Partial<Record<NodeType, TradeoffInfo>> = {
  goldengate: {
    tool: 'GoldenGate',
    layer: '2 (Logs)',
    proximityToRawData: 'Closest',
    speedLatency: 'Real-time',
    costFactors:
      'High / Very High. Licensed per processor (approx. $17,500 for Base/Non-Oracle, $20k for Big Data, up to $100k for Mainframe). Requires licenses for both source and target servers, plus ~22% annual support. Cloud services (OCI) are available via pay-as-you-go (~$0.67/OCPU hour) or BYOL.',
  },
  jdbc: {
    tool: 'JDBC/ODBC',
    layer: '3 (SQL)',
    proximityToRawData: 'Close',
    speedLatency: 'Low',
    costFactors:
      'Moderate. If using commercial drivers (like Simba), costs range from $2,625 for a single desktop developer license to enterprise/OEM contracts requiring custom quotes. Building custom drivers in-house often costs more in the long run due to 12-18 months of development and maintenance.',
  },
  'rest-api': {
    tool: 'Fusion APIs',
    layer: '4 (App)',
    proximityToRawData: 'Medium',
    speedLatency: 'Medium',
    costFactors:
      'Low (Included). Typically included with your Oracle Fusion SaaS subscription. Costs are associated with usage limits (rate limits, request volume) and the infrastructure (middleware) required to call them at scale, rather than a direct software license.',
  },
  bicc: {
    tool: 'BICC',
    layer: '5 (Batch)',
    proximityToRawData: 'Far',
    speedLatency: 'High (Batch)',
    costFactors:
      'Moderate (Bundled). Generally bundled with Oracle Fusion Analytics Warehouse (FAW) or similar offerings. As a licensed feature, it is less expensive than GoldenGate but more expensive than using raw APIs due to its managed extraction capabilities.',
  },
};

