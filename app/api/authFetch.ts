export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let res = await fetch(input, init);

  if (res.status === 401) {
    const refresh = await fetch("/api/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!refresh.ok) {
      throw new Error("Unauthorized");
    }

    res = await fetch(input, init);
  }

  return res;
}
