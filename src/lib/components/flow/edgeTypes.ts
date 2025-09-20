import CICDEdge from './edges/CICDEdge.svelte';

export const edgeTypes = {
  cicd: CICDEdge,
  default: CICDEdge
};

export type EdgeType = keyof typeof edgeTypes;
