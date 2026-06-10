import { useEffect, useState } from 'react';
import { settingsApi } from '../api/services';

// Cache: setting type -> resolved options. Plus a single shared promise for the
// authoritative list of valid types, so we never request a type the backend
// rejects (which would 422).
const cache = new Map();
let typesPromise = null;

const loadTypes = () => {
  if (!typesPromise) {
    typesPromise = settingsApi
      .types()
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => []);
  }
  return typesPromise;
};

/**
 * Fetch dropdown options for a Settings type (e.g. "zone", "department",
 * "bike_type"). Returns an array of { value, label } objects. If the type is
 * not among the backend's valid setting types, returns an empty list without
 * issuing a request that would 422.
 */
export function useSettingsOptions(type) {
  const [options, setOptions] = useState(() => cache.get(type) || []);

  useEffect(() => {
    if (!type) return;
    if (cache.has(type)) {
      setOptions(cache.get(type));
      return;
    }
    let active = true;

    loadTypes()
      .then((types) => {
        if (!types.includes(type)) {
          cache.set(type, []);
          return [];
        }
        return settingsApi.byType(type).then((data) =>
          (Array.isArray(data) ? data : []).map((s) => ({
            value: s.value,
            label: s.label || s.value
          }))
        );
      })
      .then((list) => {
        cache.set(type, list);
        if (active) setOptions(list);
      })
      .catch(() => {
        cache.set(type, []);
        if (active) setOptions([]);
      });

    return () => {
      active = false;
    };
  }, [type]);

  return options;
}
