import { createRoot } from 'react-dom/client';
import './index.css';

function CodeStakeOverlay() {
  return (
    <div className="fixed bottom-4 right-4 z-[99999] bg-[#0b0f1e] border border-slate-700 p-4 rounded-xl text-white shadow-lg">
      <h2 className="text-sm font-bold text-slate-300">CodeStake Extension Initialized</h2>
    </div>
  );
}

// Inject React into the existing website
const root = document.createElement('div');
root.id = 'codestake-extension-root';
document.body.appendChild(root);

createRoot(root).render(<CodeStakeOverlay />);
