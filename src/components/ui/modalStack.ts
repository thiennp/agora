/** Open dialogs in the order they opened. Only the last one reacts to Escape. */
const open: symbol[] = [];

export function register(id: symbol): void {
  open.push(id);
}

export function unregister(id: symbol): void {
  const at = open.indexOf(id);
  if (at >= 0) open.splice(at, 1);
}

export function isTop(id: symbol): boolean {
  return open[open.length - 1] === id;
}

export function anyOpen(): boolean {
  return open.length > 0;
}
