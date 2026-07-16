import { auth } from "@/auth";

export type CurrentActor =
  | { type: "user"; userId: string; email?: string | null }
  | { type: "anonymous" };

export async function getCurrentActor(request?: Request): Promise<CurrentActor> {
  void request;

  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    return {
      type: "user",
      userId,
      email: session.user.email,
    };
  }

  return { type: "anonymous" };
}
