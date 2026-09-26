// Satu sumber kebenaran untuk email super admin — dipakai middleware.ts
// dan semua route handler /api/panel-zakat/*, supaya literalnya tidak
// pernah drift antar file.
export const SUPER_ADMIN_EMAIL = 'superadmin@email.com'
