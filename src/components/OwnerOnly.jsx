import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

// Renders children only for owner + superadmin (financial / system scope).
export const OwnerOnly = ({ children }) => {
  const { isElevated } = usePermissions();
  return isElevated() ? <>{children}</> : null;
};
