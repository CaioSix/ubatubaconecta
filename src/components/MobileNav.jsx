import React from 'react';
import { Home, Waves, CloudSun, Briefcase, Building2, Users } from 'lucide-react';

export default function MobileNav({ activeView, onNavigate }) {
  const items = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'praias', label: 'Praias', icon: Waves },
    { id: 'cidade', label: 'Clima', icon: CloudSun },
    { id: 'vagas', label: 'Vagas', icon: Briefcase },
    { id: 'empresas', label: 'Parceiro', icon: Building2 },
    { id: 'quem-somos', label: 'Sobre', icon: Users },
  ];

  return (
    <nav className="mobile-nav" aria-label="Navegação inferior">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className="nav-button"
            aria-current={activeView === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-symbol" aria-hidden="true">
              <Icon size={18} />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
