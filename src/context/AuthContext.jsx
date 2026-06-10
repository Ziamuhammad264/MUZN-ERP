import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/services';
import { apiMessage } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Restore session on mount and validate the token against the API.
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken) {
      setLoading(false);
      return;
    }

    setToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        /* ignore corrupt cache */
      }
    }

    // Re-validate token + refresh profile/permissions in the background.
    Promise.all([authApi.me(), authApi.myPermissions()])
      .then(([me, perms]) => {
        const freshUser = me?.user || me;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
        setPermissions(normalizePermissions(perms));
      })
      .catch(() => {
        // 401 interceptor already clears storage; just reset local state.
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login({ email, password });
      const { token: newToken, user: newUser } = data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);

      try {
        const perms = await authApi.myPermissions();
        setPermissions(normalizePermissions(perms));
      } catch {
        setPermissions([]);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: apiMessage(error, 'Invalid email or password') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore — token may already be invalid */
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// my-permissions may return an array of slugs or { permissions: [...] }
function normalizePermissions(perms) {
  if (Array.isArray(perms)) return perms;
  if (Array.isArray(perms?.permissions)) return perms.permissions;
  return [];
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
