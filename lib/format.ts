export const rupiah = (n: number | null | undefined) =>
  "Rp" + Number(n || 0).toLocaleString("id-ID");

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Diterima",
  rejected: "Ditolak",
  paid: "Dibayar"
};
