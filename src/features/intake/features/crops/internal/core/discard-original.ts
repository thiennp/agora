/**
 * Run `use` with the original photo bytes and overwrite them with zeros afterwards, success or failure (INT-CRP-02): nothing keeps a
 * readable original once the request is done. Only the item crops that `use` returns survive.
 */
export async function withOriginal<T>(original: Buffer, use: (original: Buffer) => Promise<T>): Promise<T> {
  try {
    return await use(original);
  } finally {
    original.fill(0);
  }
}
