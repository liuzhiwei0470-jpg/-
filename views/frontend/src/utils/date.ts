export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    return `${hours}小时前`;
  }

  if (days === 1) {
    return '昨天';
  }

  if (days < 7) {
    return `${days}天前`;
  }

  if (days < 14) {
    return '1周前';
  }

  if (days < 21) {
    return '2周前';
  }

  if (days < 30) {
    return '3周前';
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}个月前`;
  }

  const years = Math.floor(months / 12);
  return `${years}年前`;
}

export function formatRelativeTimeFull(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (days === 0) {
    return `今天 ${hours}:${minutes}`;
  }

  if (days === 1) {
    return `昨天 ${hours}:${minutes}`;
  }

  if (days < 7) {
    return `${days}天前`;
  }

  if (days < 14) {
    return '1周前';
  }

  if (days < 21) {
    return '2周前';
  }

  if (days < 30) {
    return '3周前';
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}个月前`;
  }

  const years = Math.floor(months / 12);
  return `${years}年前`;
}
