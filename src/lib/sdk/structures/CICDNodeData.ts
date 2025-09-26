export type CICDNodeData = {
  blockType: string;
  groupType: string;
  blockId: string;
  onSuccess: null | string;
  onFailed: null | string;
} & {
  [key: string]: any;
};
