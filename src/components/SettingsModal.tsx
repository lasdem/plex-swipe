import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

interface SettingsModalProps {
  onSave: (url: string, token: string) => void;
  onClearData: () => Promise<void>;
  onClose: () => void;
  initialUrl: string;
  initialToken: string;
}

const SettingsModal = ({ onSave, onClearData, onClose, initialUrl, initialToken }: SettingsModalProps) => {
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState(initialToken);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(url, token);
  };

  const handleClear = async () => {
    setIsClearing(true);
    await onClearData();
    setIsClearing(false);
    setIsConfirmingClear(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Plex Server URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://plex.yourdomain.net"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">X-Plex-Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your Plex Token"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                required
              />
            </div>
            
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg font-semibold bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg font-semibold bg-orange-600 hover:bg-orange-500 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </form>

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Maintenance</h3>
            
            {!isConfirmingClear ? (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-900/20 text-red-500 border border-red-500/20 hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear Swipe History
              </button>
            ) : (
              <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4 space-y-4">
                <div className="flex gap-3 text-red-200 text-sm">
                  <AlertTriangle className="w-10 h-10 shrink-0 text-red-500" />
                  <p>
                    This will remove all labels/collections added by PlexSwipe from your server and reset your local history. Connection settings will be kept.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    disabled={isClearing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
