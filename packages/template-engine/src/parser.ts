/**
 * Safely resolves nested property paths from an object context
 */
export function getByPath(obj: any, path: string, fallback: any = ''): any {
  if (!obj || !path) return fallback;
  const keys = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return fallback;
    }
    current = current[key];
  }

  return current !== undefined && current !== null ? current : fallback;
}

/**
 * Escapes raw strings for safe insertion into HTML text nodes
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replaces {{ variable.path }} expressions in template strings
 */
export function interpolateString(template: string, context: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_.[\]]+)\s*\}\}/g, (match, path) => {
    const val = getByPath(context, path, '');
    return typeof val === 'object' ? '' : escapeHtml(val);
  });
}
