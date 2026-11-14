import type { Profile } from "./useProfile";

export const isVip = (p: Pick<Profile, "is_vip" | "vip_until"> | null | undefined) =>
  !!p && !!p.is_vip && (!p.vip_until || new Date(p.vip_until).getTime() > Date.now());
