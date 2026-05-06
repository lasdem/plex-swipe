import { useState, useEffect } from 'react'
import { 
  X, Trash2, AlertTriangle, Plus, ChevronDown, ChevronUp, LogIn, LogOut, Globe, Server, ExternalLink
} from 'lucide-react'
import { type SwipeConfig, type SwipeAction, type SwipeActionType, AVAILABLE_ICONS } from '../App'
import { requestPin, checkPinStatus, getServers, signOut, type PlexServer } from '../services/plexApi'

interface SettingsViewProps {
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

const COLOR_PRESETS = [
  { label: 'Blue', value: '#60a5fa' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Yellow', value: '#eab308' },
];

const SettingsView = ({ onSave, onClearData, onClose, initialUrl, initialToken, initialSwipeConfig }: SettingsViewProps) => {
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

  useEffect(() => {
    if (initialToken && servers.length === 0) {
      getServers(initialToken)
        .then(setServers)
        .catch((err) => {
          console.error('Failed to auto-fetch servers:', err);
        });
    }
  }, [initialToken]);

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

  const handlePlexLogout = async () => {
    if (token) {
      await signOut(token);
    }
    const emptyToken = '';
    const emptyUrl = '';
    setToken(emptyToken);
    setUrl(emptyUrl);
    setServers([]);
    setShowManual(true);
    
    // Immediately propagate the logout to the parent App state
    onSave(emptyUrl, emptyToken, swipeConfig);
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
    newConfig[direction] = { ...newConfig[direction] };
    newConfig[direction].actions = [...newConfig[direction].actions];
    newConfig[direction].actions[index] = { ...newConfig[direction].actions[index], ...updates };
    setSwipeConfig(newConfig);
  };

  const updateIcon = (direction: keyof SwipeConfig, icon: string) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = { ...newConfig[direction], icon };
    setSwipeConfig(newConfig);
  };

  const updateColor = (direction: keyof SwipeConfig, color: string) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = { ...newConfig[direction], color };
    setSwipeConfig(newConfig);
  };

  const addAction = (direction: keyof SwipeConfig) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = { ...newConfig[direction] };
    newConfig[direction].actions = [...newConfig[direction].actions, { type: 'add_label', value: '' }];
    setSwipeConfig(newConfig);
  };

  const removeAction = (direction: keyof SwipeConfig, index: number) => {
    const newConfig = { ...swipeConfig };
    newConfig[direction] = { ...newConfig[direction] };
    newConfig[direction].actions = newConfig[direction].actions.filter((_, i) => i !== index);
    setSwipeConfig(newConfig);
  };

  const renderActionBuilder = (direction: keyof SwipeConfig, label: string) => {
    const isExpanded = expandedDir === direction;
    const config = swipeConfig[direction];
    const actions = config.actions;
    const IconComp = AVAILABLE_ICONS[config.icon as keyof typeof AVAILABLE_ICONS]?.component || AVAILABLE_ICONS.ArrowUp.component;

    return (
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50">
        <button
          type="button"
          onClick={() => setExpandedDir(isExpanded ? null : direction)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 rounded-lg" style={{ color: config.color }}>
              <IconComp className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block leading-none mb-1">{label}</span>
              <span className="text-xs font-bold text-zinc-200">{actions.length} actions</span>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
        </button>

        {isExpanded && (
          <div className="p-4 pt-0 space-y-4 border-t border-zinc-900/50 mt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Swipe Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(AVAILABLE_ICONS).map(([key, data]) => {
                  const Icon = data.component;
                  const isSelected = config.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateIcon(direction, key)}
                      title={data.label}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'text-zinc-900 shadow-lg' 
                          : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      }`}
                      style={isSelected ? { backgroundColor: config.color } : {}}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Icon Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => updateColor(direction, preset.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      config.color === preset.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Actions</label>
              {actions.map((action, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800/50">
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
                    {action.type !== 'ignore' && (
                      <input
                        type="text"
                        value={action.value}
                        onChange={(e) => updateAction(direction, idx, { value: e.target.value })}
                        placeholder="Label or Collection name"
                        className="flex-grow bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                      />
                    )}
                    {action.type === 'ignore' && (
                      <div className="flex-grow flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-medium">Ignore for</span>
                        <input
                          type="number"
                          value={action.days || 0}
                          onChange={(e) => updateAction(direction, idx, { days: parseInt(e.target.value) || 0 })}
                          placeholder="Days"
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                        />
                        <span className="text-[10px] text-zinc-500 font-medium">days (0 = forever)</span>
                      </div>
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col bg-zinc-950 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-800 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
        <h2 className="text-xl font-semibold">Settings</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2 -mr-2">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-grow">
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Plex Connection</h3>
            
            {authError && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            {token ? (
              <button
                type="button"
                onClick={handlePlexLogout}
                className="w-full py-2.5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
              >
                <LogOut className="w-5 h-5" />
                Logout from Plex
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlexSignIn}
                disabled={isAuthenticating}
                className="w-full py-2.5 sm:py-3 bg-[#e5a00d] hover:bg-[#c98c0b] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 active:scale-[0.98]"
              >
                {isAuthenticating ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isAuthenticating ? 'Waiting for Plex...' : 'Sign In with Plex'}
              </button>
            )}

            {servers.length > 0 && token && (
              <div className="space-y-2 sm:space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1 sm:space-y-2">
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
                        {srv.name} — {srv.uri}
                      </option>
                    ))}
                  </select>
                </div>
                
                {url.includes('.plex.direct') && (
                  <div className="p-2 sm:p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      <AlertTriangle className="w-3 h-3 inline mr-1 text-orange-500" />
                      Connections to <code className="text-zinc-400">.plex.direct</code> may fail if your browser hasn't trusted the server's certificate or if DNS rebinding protection is active.
                    </p>
                    <a 
                      href={`${url}/identity`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-orange-500 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Verify connection in new tab
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="text-[10px] text-zinc-500 uppercase font-bold hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Manual Configuration
              </button>

              {showManual && (
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 p-3 sm:p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-xl animate-in fade-in duration-200">
                  <div className="space-y-1.5 sm:space-y-2">
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
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-zinc-500">X-Plex-Token</label>
                      <a 
                        href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-orange-500 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Where do I find this?
                      </a>
                    </div>
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

          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Swipe Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderActionBuilder('left', 'Left Swipe')}
              {renderActionBuilder('right', 'Right Swipe')}
              {renderActionBuilder('up', 'Up Swipe')}
              {renderActionBuilder('down', 'Down Swipe')}
            </div>
          </div>
          
          <div className="pt-2 sm:pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg font-semibold bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg font-semibold bg-orange-600 hover:bg-orange-500 transition-colors text-sm"
            >
              Save Settings
            </button>
          </div>
        </form>

        <div className="pt-4 sm:pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 sm:mb-4 uppercase tracking-wider">Maintenance</h3>
          
          {!isConfirmingClear ? (
            <button
              onClick={() => setIsConfirmingClear(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-900/20 text-red-500 border border-red-500/20 hover:bg-red-900/30 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear Data & Reset Tags
            </button>
          ) : (
            <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="flex gap-2 sm:gap-3 text-red-200 text-[11px] sm:text-xs">
                <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 text-red-500" />
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
  );
};

export default SettingsView;
