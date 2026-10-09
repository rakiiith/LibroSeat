export const C = {
  primary: '#14919B',
  primaryLight: '#E3F4F5',
  danger: '#E53935',
  dangerLight: '#FDECEA',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F7FAFB',
  card: '#FFFFFF',
};

export const firstNameOf = (name, fallback = 'there') => {
  const s = String(name || '').trim();
  return s ? s.split(/\s+/)[0] : fallback;
};

export const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
};

export const timeAgo = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
};