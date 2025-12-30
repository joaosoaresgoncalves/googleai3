
export interface ArticleAnalysis {
  id: string;
  filename: string;
  title: string;
  authors: string;
  year: string;
  problem: string;
  methodology: string;
  findings: string;
  critique: string;
}

export interface SynthesisReport {
  analyses: ArticleAnalysis[];
  matrixMarkdown: string;
  narrativeSynthesis: string;
  conflicts: string;
}

export enum ProcessStatus {
  IDLE = 'idle',
  EXTRACTING = 'extracting',
  SYNTHESIZING = 'synthesizing',
  COMPLETED = 'completed',
  ERROR = 'error'
}
