const cleanupByRoot = new WeakMap<HTMLElement, () => void>();

export function releaseRenderCleanup(root: HTMLElement): void {
  const cleanup = cleanupByRoot.get(root);
  if (!cleanup) return;
  cleanupByRoot.delete(root);
  cleanup();
}

export function setRenderCleanup(root: HTMLElement, cleanup: () => void): void {
  releaseRenderCleanup(root);
  cleanupByRoot.set(root, cleanup);
}
