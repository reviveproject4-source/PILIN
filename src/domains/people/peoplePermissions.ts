export const PEOPLE_PERMISSIONS = {
  VIEW: 'people:employee:view',
  CREATE: 'people:employee:create',
  UPDATE: 'people:employee:update',
  MANAGE: 'people:employee:manage',
} as const;

export type PeoplePermission = typeof PEOPLE_PERMISSIONS[keyof typeof PEOPLE_PERMISSIONS];
