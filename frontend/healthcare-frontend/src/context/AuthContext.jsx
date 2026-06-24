import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, appointmentService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasConsulted, setHasConsulted] = useState(false);

  const checkConsultationStatus = useCallback(async (userData) => {
    // Only check for patients
    if (!userData || userData.role !== 'patient') {
      setHasConsulted(true); // Non-patients always have full access
      return;
    }
    try {
      const patientId = userData.patient_profile;
      if (!patientId) {
        setHasConsulted(false);
        return;
      }
      const result = await appointmentService.getAll({ patient: patientId, status: 'Completed' });
      const appointments = result.data || [];
      setHasConsulted(appointments.length > 0);
    } catch {
      setHasConsulted(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const response = await authService.getProfile();
          setUser(response.data);
          await checkConsultationStatus(response.data);
        } catch {
          authService.logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [checkConsultationStatus]);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    if (result.success) {
      try {
        const response = await authService.getProfile();
        setUser(response.data);
        await checkConsultationStatus(response.data);
      } catch {
        setUser(result.user);
      }
    }
    return result;
  };

  const googleLogin = async (credential) => {
    const result = await authService.googleLogin(credential);
    if (result.success) {
      try {
        const response = await authService.getProfile();
        setUser(response.data);
        await checkConsultationStatus(response.data);
      } catch {
        setUser(result.user);
      }
    }
    return result;
  };

  const refreshConsultationStatus = async () => {
    if (user) await checkConsultationStatus(user);
  };

  const register = async (userData) => {
    const result = await authService.register(userData);
    return result;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setHasConsulted(false);
  };

  const hasRole = (role) => user?.role === role;

  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isStaff = user?.role === 'staff';

  return (
    <AuthContext.Provider value={{
      user, loading, login, googleLogin, register, logout,
      isAuthenticated: !!user, isAdmin, isDoctor, isPatient, isStaff,
      hasRole, hasConsulted, refreshConsultationStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
