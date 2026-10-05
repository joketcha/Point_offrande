import { useEffect, useState, type ReactNode } from 'react';
import { fmt } from './domain/dates';
import { ROLES } from './domain/referentiel';
import { useStore } from './store/store';
import { useRoute } from './ui/kit';
import Accueil from './pages/Accueil';
import Planning from './pages/Planning';
import Gantt from './pages/Gantt';
import RevisionPage from './pages/Revision';
import Arborescence from './pages/Arborescence';
import Gammes from './pages/Gammes';
import ImportGamme from './pages/Import';
import FluxPdr from './pages/FluxPdr';
import Techniciens from './pages/Techniciens';
import Travaux from './pages/Travaux';
import Redemarrage from './pages/Redemarrage';
import Risques from './pages/Risques';
import Notifications from './pages/Notifications';
import RexPage from './pages/Rex';
import KpiPage from './pages/Kpi';
import Audit from './pages/Audit';
import Admin from './pages/Admin';

interface Entree {
  id: string;
  label: string;
  ico: string;
  cnt?: number;
}

export default function App() {
  const route = useRoute();
  const { d, user, setUser, today, mesNotifications, toasts } = useStore();
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('pilotage-revisions:theme') || 'auto';
    } catch {
      return 'auto';
    }
  });
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pilotage-revisions:theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [route.join('/')]);

  const ouvertes = mesNotifications.filter((n) => n.statut !== 'CLOTUREE' && n.nature === 'RISQUE' && (n.niveau === 'CRITIQUE' || n.relation === 'RESPONSABLE')).length;
  const groupes: { titre: string; items: Entree[] }[] = [
    {
      titre: 'Pilotage',
      items: [
        { id: '', label: 'Accueil', ico: '◉' },
        { id: 'notifications', label: 'Mes notifications', ico: '🔔', cnt: ouvertes },
        { id: 'risques', label: 'Risques', ico: '⚠' },
        { id: 'kpi', label: 'KPI', ico: '📊' },
      ],
    },
    {
      titre: 'Planification',
      items: [
        { id: 'planning', label: 'Planification annuelle', ico: '📅' },
        { id: 'gantt', label: 'Gantt intelligent', ico: '▤' },
      ],
    },
    {
      titre: 'Préparation',
      items: [
        { id: 'arborescence', label: 'Sites › Lignes › Machines', ico: '🏭' },
        { id: 'gammes', label: 'Gammes de révision', ico: '📋' },
        { id: 'import', label: 'Importer une gamme', ico: '⇪' },
      ],
    },
    {
      titre: 'Flux PDR',
      items: [
        { id: 'achats', label: 'Achats', ico: '🧾' },
        { id: 'transit', label: 'Transit', ico: '🚢' },
        { id: 'reception', label: 'Réception', ico: '📦' },
      ],
    },
    {
      titre: 'Exécution',
      items: [
        { id: 'techniciens', label: 'Techniciens', ico: '👷' },
        { id: 'travaux', label: 'Travaux', ico: '🔧' },
        { id: 'redemarrage', label: 'Redémarrage & stabilisation', ico: '▶' },
      ],
    },
    {
      titre: 'Capitalisation',
      items: [
        { id: 'rex', label: 'REX', ico: '💡' },
        { id: 'audit', label: 'Historique / audit', ico: '🕘' },
        { id: 'admin', label: 'Administration', ico: '⚙' },
      ],
    },
  ];

  const page = route[0] ?? '';
  let contenu: ReactNode;
  switch (page) {
    case '':
      contenu = <Accueil />;
      break;
    case 'planning':
      contenu = <Planning />;
      break;
    case 'gantt':
      contenu = <Gantt />;
      break;
    case 'revision':
      contenu = <RevisionPage id={route[1]} onglet={route[2]} />;
      break;
    case 'arborescence':
      contenu = <Arborescence />;
      break;
    case 'gammes':
      contenu = <Gammes />;
      break;
    case 'import':
      contenu = <ImportGamme />;
      break;
    case 'achats':
    case 'transit':
    case 'reception':
      contenu = <FluxPdr module={page} />;
      break;
    case 'techniciens':
      contenu = <Techniciens />;
      break;
    case 'travaux':
      contenu = <Travaux />;
      break;
    case 'redemarrage':
      contenu = <Redemarrage />;
      break;
    case 'risques':
      contenu = <Risques />;
      break;
    case 'notifications':
      contenu = <Notifications />;
      break;
    case 'rex':
      contenu = <RexPage />;
      break;
    case 'kpi':
      contenu = <KpiPage />;
      break;
    case 'audit':
      contenu = <Audit />;
      break;
    case 'admin':
      contenu = <Admin />;
      break;
    default:
      contenu = <div className="empty">Page introuvable.</div>;
  }

  return (
    <div className="app">
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <aside className={`side ${menu ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">RA</div>
          <div>
            <b>Révisions annuelles</b>
            <small>Centre de pilotage</small>
          </div>
        </div>
        <nav className="nav">
          {groupes.map((g) => (
            <div className="nav-group" key={g.titre}>
              <span>{g.titre}</span>
              {g.items.map((i) => (
                <a key={i.id} href={`#/${i.id}`} className={page === i.id || (page === 'revision' && i.id === 'planning') ? 'on' : ''}>
                  <span className="ico">{i.ico}</span>
                  {i.label}
                  {i.cnt ? <span className="cnt">{i.cnt}</span> : null}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="top">
          <button className="btn icon burger" onClick={() => setMenu(true)} aria-label="Menu">
            ☰
          </button>
          <span className="small muted">
            Date de pilotage : <b style={{ color: 'var(--text)' }}>{fmt(today)}</b>
            {d.parametres.dateReference ? ' (simulée)' : ''}
          </span>
          <div className="grow" />
          <label className="row small" title="Simulation de connexion : chaque rôle ne voit et ne modifie que son domaine">
            <span className="muted">Connecté :</span>
            <select className="inline" value={user.id} onChange={(e) => setUser(e.target.value)} aria-label="Utilisateur">
              {d.utilisateurs
                .filter((u) => u.actif)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom} — {ROLES[u.role].court}
                  </option>
                ))}
            </select>
          </label>
          <select className="inline small" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Thème">
            <option value="auto">Thème auto</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </header>
        <main className="content">{contenu}</main>
      </div>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
