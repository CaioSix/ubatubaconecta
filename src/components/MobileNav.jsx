import React from 'react';
import { Home, Waves, CloudSun, Compass, Briefcase, Building2 } from 'lucide-react';

export default function MobileNav({ activeView, onNavigate }) {
  const items = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'praias', label: 'Praias', icon: Waves },
    { id: 'cidade', label: 'Clima', icon: CloudSun },
    { id: 'explorar', label: 'Explorar', icon: Compass },
    { id: 'vagas', label: 'Vagas', icon: Briefcase },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
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
