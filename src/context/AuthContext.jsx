import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ClerkProvider,
  useUser as useClerkUser,
  useAuth as useClerkAuth,
  useClerk,
} from '@clerk/clerk-react';
import { X, Lock, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { fetchPartnerSession } from '../services/partnerApi';

const CLERK_PUBLISHABLE_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();
const hasValidClerkKey =
  CLERK_PUBLISHABLE_KEY.startsWith('pk_test_') || CLERK_PUBLISHABLE_KEY.startsWith('pk_live_');

const LOCAL_CLERK_STORAGE_KEY = 'ubatuba-conecta-clerk-dev-session-v1';

const AuthContext = createContext(null);

export function usePartnerAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('usePartnerAuth must be used inside PartnerAuthProvider');
  }
  return ctx;
}

function ClerkBackedAuthBridge({ children }) {
  const { isLoaded, isSignedIn, user } = useClerkUser();
  const { getToken } = useClerkAuth();
  const { openSignIn, signOut } = useClerk();

  const [partnerSession, setPartnerSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const normalizedUser =
    isSignedIn && user
      ? {
          id: user.id,
          name: user.fullName || user.firstName || user.username || 'Parceiro',
          email: user.primaryEmailAddress?.emailAddress || '',
          imageUrl: user.imageUrl || '',
          publicMetadata: user.publicMetadata || {},
        }
      : null;

  const refreshPartnerSession = useCallback(async () => {
    if (!normalizedUser?.id) {
      setPartnerSession(null);
      return null;
    }
    setSessionLoading(true);
    try {
      const data = await fetchPartnerSession(normalizedUser, getToken);
      setPartnerSession(data);
      return data;
    } finally {
      setSessionLoading(false);
    }
  }, [normalizedUser?.id, normalizedUser?.email, normalizedUser?.name, getToken]);

  useEffect(() => {
    if (isLoaded) {
      refreshPartnerSession();
    }
  }, [isLoaded, isSignedIn, refreshPartnerSession]);

  return (
    <AuthContext.Provider
      value={{
        isClerkConfigured: true,
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        user: normalizedUser,
        getToken,
        openLoginModal: () => openSignIn(),
        logout: () => signOut(),
        partnerSession,
        setPartnerSession,
        sessionLoading,
        refreshPartnerSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function LocalDevClerkBridge({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_CLERK_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const [partnerSession, setPartnerSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const getToken = useCallback(async () => {
    if (!user?.id) return '';
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const payload = btoa(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + 86400,
      })
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `${header}.${payload}.clerk_dev_sig`;
  }, [user]);

  const refreshPartnerSession = useCallback(async () => {
    if (!user?.id) {
      setPartnerSession(null);
      return null;
    }
    setSessionLoading(true);
    try {
      const data = await fetchPartnerSession(user, getToken);
      setPartnerSession(data);
      return data;
    } finally {
      setSessionLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    refreshPartnerSession();
  }, [refreshPartnerSession]);

  function handleDevSignIn(e) {
    e.preventDefault();
    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanName = formName.trim() || cleanEmail.split('@')[0] || 'Parceiro Ubatuba';
    if (!cleanEmail) return;

    const deterministicId = `user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
    const newUser = {
      id: deterministicId,
      name: cleanName,
      email: cleanEmail,
    };

    try {
      window.localStorage.setItem(LOCAL_CLERK_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // ignore
    }
    setUser(newUser);
    setLoginModalOpen(false);
  }

  function handleLogout() {
    try {
      window.localStorage.removeItem(LOCAL_CLERK_STORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setPartnerSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        isClerkConfigured: false,
        isLoaded: true,
        isSignedIn: Boolean(user),
        user,
        getToken,
        openLoginModal: () => setLoginModalOpen(true),
        logout: handleLogout,
        partnerSession,
        setPartnerSession,
        sessionLoading,
        refreshPartnerSession,
      }}
    >
      {children}

      {loginModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setLoginModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clerk-modal-title"
        >
          <div
            className="modal-card clerk-auth-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-body">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <span className="status-tag">
                  <ShieldCheck size={14} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} />
                  Clerk Auth · Área do Parceiro
                </span>
                <button
                  type="button"
                  className="button-quiet button-sm"
                  onClick={() => setLoginModalOpen(false)}
                  aria-label="Fechar login"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 id="clerk-modal-title" style={{ marginTop: 4 }}>
                Entrar na Área do Parceiro
              </h2>
              <p className="modal-description" style={{ marginBottom: 16 }}>
                Ao fazer login, suas informações de parceiro, status de pagamento no Mercado Pago e
                avisos de vencimento (3 dias antes) são carregados automaticamente da API em Go.
              </p>

              <form onSubmit={handleDevSignIn} className="form-grid" style={{ gap: 14 }}>
                <div className="field-full">
                  <label htmlFor="clerkDevName">
                    <UserIcon size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    Seu nome completo
                  </label>
                  <input
                    id="clerkDevName"
                    type="text"
                    required
                    placeholder="Ex.: Caio Cavalcanti"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="field-full">
                  <label htmlFor="clerkDevEmail">
                    <Mail size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    Seu e-mail de acesso
                  </label>
                  <input
                    id="clerkDevEmail"
                    type="email"
                    required
                    placeholder="voce@suaempresa.com.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>

                <div className="field-full">
                  <button type="submit" className="button-primary" style={{ width: '100%' }}>
                    <Lock size={15} style={{ marginRight: 6 }} />
                    Continuar com Clerk
                  </button>
                </div>
              </form>

              <p className="helper-text" style={{ marginTop: 14, fontSize: '0.8rem' }}>
                Para usar o widget de produção da Clerk, defina{' '}
                <code>VITE_CLERK_PUBLISHABLE_KEY</code> no arquivo <code>.env</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function PartnerAuthProvider({ children }) {
  if (hasValidClerkKey) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkBackedAuthBridge>{children}</ClerkBackedAuthBridge>
      </ClerkProvider>
    );
  }
  return <LocalDevClerkBridge>{children}</LocalDevClerkBridge>;
}
