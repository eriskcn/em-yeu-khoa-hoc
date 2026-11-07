export function createHistory(limit = 100) {
  let stack = [];
  let i = -1;
  return {
    push(snapshot) {
      if (snapshot === stack[i]) return;
      stack = stack.slice(0, i + 1);
      stack.push(snapshot);
      if (stack.length > limit) stack.shift();
      i = stack.length - 1;
    },
    current: () => (i >= 0 ? stack[i] : null),
    undo: () => (i > 0 ? stack[--i] : null),
    redo: () => (i < stack.length - 1 ? stack[++i] : null),
    canUndo: () => i > 0,
    canRedo: () => i < stack.length - 1,
    reset(snapshot) {
      stack = [snapshot];
      i = 0;
    },
  };
}
