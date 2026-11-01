export const uid = (): string => Math.random().toString(36).slice(2, 10);

export function money(n: number | string, cur = 'RM'): string {
  let s = Number(n || 0).toFixed(2);
  if (s.endsWith('.00')) s = s.slice(0, -3);
  return cur + s;
}

/** Malaysian numbers: 012-345 6789 -> 60123456789 */
export function waNumber(raw: string | undefined | null): string {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '6' + d;
  return d;
}

/** 60123456789 -> +60 12-345 6789 */
export function fmtPhone(d: string): string {
  if (!d) return '';
  const m = String(d).match(/^60(\d{2})(\d{3,4})(\d{4})$/);
  return m ? `+60 ${m[1]}-${m[2]} ${m[3]}` : '+' + d;
}

export function slugify(s: string): string {
  return (
    String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'kedai'
  );
}

export const plain = (s: string) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

export function relDate(ts: number | string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  const time = d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return 'Today, ' + time;
  if (diff === 1) return 'Yesterday, ' + time;
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
