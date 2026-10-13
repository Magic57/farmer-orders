import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  registerNewFarm: (email: string, pass: string, name: string, farmName: string, role: UserRole) => Promise<void>;
  registerJoinFarm: (email: string, pass: string, name: string, inviteCode: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  changeRole: (role: UserRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = AuthService.subscribeAuth(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await AuthService.getUserProfile(firebaseUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    const profile = await AuthService.login(email, pass);
    setUser(profile);
  };

  const registerNewFarm = async (
    email: string,
    pass: string,
    name: string,
    farmName: string,
    role: UserRole
  ) => {
    const profile = await AuthService.registerWithNewFarm(email, pass, name, farmName, role);
    setUser(profile);
  };

  const registerJoinFarm = async (
    email: string,
    pass: string,
    name: string,
    inviteCode: string,
    role: UserRole
  ) => {
    const profile = await AuthService.registerJoinFarm(email, pass, name, inviteCode, role);
    setUser(profile);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const reloadProfile = async () => {
    if (user?.uid) {
      const p = await AuthService.getUserProfile(user.uid);
      if (p) setUser(p);
    }
  };

  const changeRole = async (newRole: UserRole) => {
    if (user?.uid) {
      await AuthService.updateUserRole(user.uid, newRole);
      setUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }
  };

  const resetPassword = async (userEmail: string) => {
    await AuthService.resetPassword(userEmail);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerNewFarm,
        registerJoinFarm,
        logout,
        reloadProfile,
        changeRole,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
