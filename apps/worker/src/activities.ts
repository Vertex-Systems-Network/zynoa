/** Activities run on the worker host (not in the workflow sandbox). */

export async function greet(name: string): Promise<string> {
  if (!name.trim()) throw new Error("greet needs a non-empty name");
  return `Hello, ${name}!`;
}

/** The activity registry handed to every Worker. */
export const activities = { greet };

export type Activities = typeof activities;
