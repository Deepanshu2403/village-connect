import { createContext, useContext, useEffect, useMemo, useState } from "react";
import API from "../api/client";
import { getMe, loginUser, registerUser } from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await API.put("/location/driver", {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          } catch {
            // Location capture should never block login.
          }
        },
        () => {},
        { timeout: 8000, maximumAge: 300000 }
      );
    }

    return res.data.user;
  };

  const signup = async (payload) => {
    const res = await registerUser(payload);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
