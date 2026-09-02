export default defineNuxtRouteMiddleware((to, from) => {
  let hostname = '';
  let tenantSlug = '';

  if (import.meta.server) {
    const reqHeaders = useRequestHeaders(['host', 'x-tenant-slug']);
    hostname = reqHeaders.host || '';
    tenantSlug = reqHeaders['x-tenant-slug'] || '';
  } else if (typeof window !== 'undefined') {
    hostname = window.location.host;
  }

  // Check if hostname is a subdomain (e.g. sman1nusantara.localhost:3000 or sman1.sobat.com)
  const hostWithoutPort = hostname.split(':')[0].toLowerCase();
  const parts = hostWithoutPort.split('.');

  // If host is e.g. sman1.localhost or sman1.sobat.com (and not www / admin / app / root)
  const isSubdomain = parts.length >= 2 && !['localhost', 'sobat', '127', 'www', 'admin', 'app'].includes(parts[0]);

  const slug = tenantSlug || (isSubdomain ? parts[0] : null);

  // If visiting public subdomain and not on preview or api routes, route to public school page
  if (slug && !to.path.startsWith('/api') && !to.path.startsWith('/dashboard') && !to.path.startsWith('/admin') && !to.path.startsWith('/login') && !to.path.startsWith('/register')) {
    to.params.tenantSlug = slug;
  }
});
