import { useState } from 'react'
import { X, Trash2, AlertTriangle, Plus, ChevronDown, ChevronUp, LogIn, Globe, Server } from 'lucide-react'
import type { SwipeConfig, SwipeAction, SwipeActionType } from '../App'
import { requestPin, checkPinStatus, getServers, type PlexServer } from '../services/plexApi'

interface SettingsModalProps {
  onSave: (url: string, token: string, swipeConfig: SwipeConfig) => void;
  onClearData: () => Promise<void>;
  onClose: () => void;
  initialUrl: string;
  initialToken: string;
  initialSwipeConfig: SwipeConfig;
}

const ACTION_TYPES: { value: SwipeActionType; label: string }[] = [
  { value: 'add_label', label: 'Add Label' },
  { value: 'remove_label', label: 'Remove Label' },
  { value: 'add_collection', label: 'Add Collection' },
  { value: 'remove_collection', label: 'Remove Collection' },
  { value: 'ignore', label: 'Ignore Locally' }
];

const SettingsModal = ({ onSave, onClearData, onClose, initialUrl, initialToken, initialSwipeConfig }: SettingsModalProps) => {
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState(initialToken);
  const [swipeConfig, setSwipeConfig] = useState<SwipeConfig>(initialSwipeConfig);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [expandedDir, setExpandedDir] = useState<keyof SwipeConfig | null>(null);

  // OAuth States
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [servers, setServers] = useState<PlexServer[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(!initialToken);

  const handlePlexSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const pinData = await requestPin();
      const clientId = localStorage.getItem('plex_client_id');
      const authUrl = `https://app.plex.tv/auth#?clientID=${clientId}&code=${pinData.code}&context[device][product]=PlexSwipe`;
      
      const popup = window.open(authUrl, 'PlexAuth', 'width=600,height=700');
      
      const pollInterval = setInterval(async () => {
        try {
          const status = await checkPinStatus(pinData.id);
          if (status.authToken) {
            clearInterval(pollInterval);
            if (popup) popup.close();
            setToken(status.authToken);
            
            // Fetch servers
            try {
              const fetchedServers = await getServers(status.authToken);
              setServers(fetchedServers);
              if (fetchedServers.length > 0) {
                // If we found servers, default to the first one but don't stop authentication state yet
                // so user sees progress.
                setUrl(fetchedServers[0].uri);
              }
              setIsAuthenticating(false);
            } catch (err) {
              console.error('Failed to fetch servers:', err);
              setAuthError('Authenticated successfully, but could not discover your servers.');
              setIsAuthenticating(false);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
          // Keep polling unless window is closed or explicit error
        }
      }, 2000);

      // Stop polling if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(pollInterval);
          clearInterval(checkPopup);
          setIsAuthenticating(false);
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsAuthenticating(false);
      }, 5 * 60 * 1000);

    } catch (err) {
      console.error('Sign in error:', err);
      setIsAuthenticating(false);
      setAuthError('Failed to initialize Plex authentication.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(url, token, swipeConfig);
  };

  const handleClear = async () => {
    setIsClearing(true);
    await onClearData();
    setIsClearing(false);
    setIsConfirmingClear(false);
  };

  const updateAction = (direction: keyof SwipeConfig, index: number, updates: Partial<SwipeAction>) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = [...newConfig[direction]];
    newConfig[direction][index] = { ...newConfig[direction][index], ...updates };
    setSwipeConfig(newConfig);
  };

  const addAction = (direction: keyof SwipeConfig) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = [...newConfig[direction], { type: 'add_label', value: '' }];
    setSwipeConfig(newConfig);
  };

  const removeAction = (direction: keyof SwipeConfig, index: number) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = newConfig[direction].filter((_, i) => i !== index);
    setSwipeConfig(newConfig);
  };

  const renderActionBuilder = (direction: keyof SwipeConfig, label: string) => {
    const isExpanded = expandedDir === direction;
    const actions = swipeConfig[direction];

    return (
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50">
        <button
          type="button"
          onClick={() => setExpandedDir(isExpanded ? null : direction)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-widest text-orange-500">{label}</span>
            <span className="text-xs text-zinc-500">{actions.length} actions</span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="p-4 pt-0 space-y-3">
            {actions.map((action, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="flex gap-2">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(direction, idx, { type: e.target.value as SwipeActionType })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                  >
                    {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAction(direction, idx)}
                    className="p-1 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={action.value}
                    onChange={(e) => updateAction(direction, idx, { value: e.target.value })}
                    placeholder={action.type === 'ignore' ? 'Reference label' : 'Label or Collection name'}
                    className="flex-grow bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                  />
                  {action.type === 'ignore' && (
                    <input
                      type="number"
                      value={action.days || 0}
                      onChange={(e) => updateAction(direction, idx, { days: parseInt(e.target.value) || 0 })}
                      placeholder="Days"
                      className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addAction(direction)}
              className="w-full py-2 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-500 hover:text-orange-500 hover:border-orange-500/50 transition-all flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Action
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 w-full max-w-lg rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Plex Connection</h3>
              
              {authError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePlexSignIn}
                disabled={isAuthenticating}
                className="w-full py-3 bg-[#e5a00d] hover:bg-[#c98c0b] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 active:scale-[0.98]"
              >
                {isAuthenticating ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isAuthenticating ? 'Waiting for Plex...' : 'Sign In with Plex'}
              </button>

              {servers.length > 0 && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                    <Server className="w-3 h-3" /> Select Server
                  </label>
                  <select
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                  >
                    {servers.map((srv, idx) => (
                      <option key={idx} value={srv.uri}>
                        {srv.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowManual(!showManual)}
                  className="text-[10px] text-zinc-500 uppercase font-bold hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                  {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Manual Configuration
                </button>

                {showManual && (
                  <div className="mt-4 space-y-4 p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Server URL
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://plex.yourdomain.net"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500">X-Plex-Token</label>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Your Plex Token"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Swipe Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderActionBuilder('left', 'Left Swipe')}
                {renderActionBuilder('right', 'Right Swipe')}
                {renderActionBuilder('up', 'Up Swipe')}
                {renderActionBuilder('down', 'Down Swipe')}
              </div>
            </div>
            
            <div className="pt-4 flex gap-3">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-900/20 text-red-500 border border-red-500/20 hover:bg-red-900/30 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data & Reset Tags
              </button>
            ) : (
              <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4 space-y-4">
                <div className="flex gap-3 text-red-200 text-xs">
                  <AlertTriangle className="w-10 h-10 shrink-0 text-red-500" />
                  <p>
                    This will attempt to remove configured labels/collections from your Plex server based on your CURRENT swipe action settings. It will also clear your local ignore list.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    disabled={isClearing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-2 px-3 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
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
