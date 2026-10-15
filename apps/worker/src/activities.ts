/** Activities run in the Node worker (not the workflow sandbox). */

export async function greet(name: string): Promise<string> {
  return `Hello, ${name}!`;
}
