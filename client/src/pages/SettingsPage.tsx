import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Skeleton,
} from '../components/ui';
import {
  User,
  Key,
  Sliders,
  Shield,
  Copy,
  Check,
  Trash2,
  Plus,
  Terminal,
  AlertTriangle,
  Lock,
  Save,
  Sparkles,
  ExternalLink,
  Code,
  CheckCircle2,
} from 'lucide-react';
import { userApi, type ApiKeyRecord, type UserProfileData } from '../lib/api';
import { useAuth } from '../features/auth/AuthContext';
import { useTheme } from '../app/providers/ThemeProvider';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'apikeys' | 'preferences'>('profile');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile Edit State
  const [nameInput, setNameInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ name: string; secret: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyErrorMsg, setKeyErrorMsg] = useState<string | null>(null);

  // Snippet Copy State
  const [snippetPlatform, setSnippetPlatform] = useState<'powershell' | 'curl' | 'github' | 'node'>('powershell');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Load Profile and API keys
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingProfile(true);
        const res = await userApi.getProfile();
        if (res.success && res.data?.user) {
          setProfile(res.data.user);
          setNameInput(res.data.user.name);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'apikeys') {
      loadApiKeys();
    }
  }, [activeTab]);

  const loadApiKeys = async () => {
    try {
      setLoadingKeys(true);
      const res = await userApi.listApiKeys();
      if (res.success && res.data?.apiKeys) {
        setApiKeys(res.data.apiKeys);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    try {
      setSavingProfile(true);
      setProfileSuccessMsg(null);
      setProfileErrorMsg(null);

      const res = await userApi.updateProfile({ name: nameInput.trim() });
      if (res.success && res.data?.user) {
        setProfile(res.data.user);
        updateUser({ name: res.data.user.name });
        setProfileSuccessMsg('Profile information updated successfully.');
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      } else {
        setProfileErrorMsg(res.error?.message || 'Failed to update profile.');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setProfileErrorMsg(errorObj.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await userApi.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordSuccessMsg('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccessMsg(null), 4000);
      } else {
        setPasswordErrorMsg(res.error?.message || 'Failed to change password.');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setPasswordErrorMsg(errorObj.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setGeneratingKey(true);
      setKeyErrorMsg(null);
      const res = await userApi.createApiKey(newKeyName.trim());
      if (res.success && res.data?.apiKey) {
        setRevealedKey({
          name: res.data.apiKey.name,
          secret: res.data.apiKey.secretKey || '',
        });
        setNewKeyName('');
        setIsCreatingKey(false);
        loadApiKeys();
      } else {
        setKeyErrorMsg(res.error?.message || 'Could not generate API key.');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setKeyErrorMsg(errorObj.message || 'Could not generate API key.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke API key "${name}"? Any active CI/CD pipelines using it will lose access immediately.`)) {
      return;
    }

    try {
      const res = await userApi.revokeApiKey(id);
      if (res.success) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        alert(res.error?.message || 'Failed to revoke API key');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Failed to revoke API key: ${errorObj.message}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'newKey') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2500);
    }
  };

  const powershellSnippet = `Invoke-RestMethod -Uri "http://localhost:5000/api/scans" \`
  -Method Post \`
  -Headers @{ Authorization = "Bearer <YOUR_API_KEY>" } \`
  -ContentType "application/json" \`
  -Body '{"url": "https://example.com"}'`;

  const curlSnippet = `curl -X POST http://localhost:5000/api/scans \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`;

  const nodeSnippet = `const res = await fetch('http://localhost:5000/api/scans', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: 'https://example.com' }),
});
const data = await res.json();
console.log(data);`;

  const githubActionsSnippet = `name: WebLens Quality Gate
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger WebLens Scan
        run: |
          RESPONSE=$(curl -s -X POST http://localhost:5000/api/scans \\
            -H "Authorization: Bearer \${{ secrets.WEBLENS_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{"url": "https://my-preview-url.vercel.app"}')
          echo "Audit Response: $RESPONSE"`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Account Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage profile details, generate personal API keys for CI/CD pipelines, and configure preferences
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('apikeys')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'apikeys'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API Keys & CI/CD</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'preferences'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Preferences</span>
        </button>
      </div>

      {/* TAB 1: Profile & Security */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Details */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your WebLens identity and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Display Name
                    </label>
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2">
                      <Input value={profile?.email || user?.email || ''} disabled className="bg-slate-950/60 opacity-80 cursor-not-allowed" />
                      <Badge variant="success" size="sm">Verified</Badge>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Email address is linked to account authentication and cannot be changed directly.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Account Role
                    </label>
                    <Badge variant="default" size="md">
                      {profile?.role || user?.role || 'USER'}
                    </Badge>
                  </div>

                  <div className="pt-2">
                    <Button variant="primary" size="sm" type="submit" disabled={savingProfile} className="gap-2">
                      <Save className="w-3.5 h-3.5" />
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                Security & Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password with cryptographic bcrypt verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                {passwordSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="sm" type="submit" disabled={savingPassword} className="gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    {savingPassword ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: API Keys & CI/CD */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          {/* Secret Key Modal / Banner */}
          {revealedKey && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>API Key Generated: {revealedKey.name}</span>
                </div>
                <button
                  onClick={() => setRevealedKey(null)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Please copy your personal API key now. For security purposes, this secret key will <strong className="text-emerald-300">never be displayed again</strong>.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={revealedKey.secret}
                  className="w-full bg-slate-950 font-mono text-xs px-3 py-2 rounded-lg border border-slate-800 text-emerald-300 select-all"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => copyToClipboard(revealedKey.secret, 'newKey')}
                  className="gap-1.5 flex-shrink-0 bg-emerald-600 hover:bg-emerald-500"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? 'Copied!' : 'Copy Key'}
                </Button>
              </div>
            </div>
          )}

          {/* Active Keys Card */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400" />
                  Personal API Keys
                </CardTitle>
                <CardDescription className="text-xs">
                  Authenticate automated test suites, GitHub Actions, and command-line scripts
                </CardDescription>
              </div>

              {!isCreatingKey && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatingKey(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New API Key
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isCreatingKey && (
                <form
                  onSubmit={handleCreateApiKey}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl mb-4 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-200">Generate Personal API Key</div>
                  {keyErrorMsg && (
                    <div className="text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{keyErrorMsg}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. GitHub Actions CI/CD"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      required
                      autoFocus
                    />
                    <Button variant="primary" size="sm" type="submit" disabled={generatingKey}>
                      {generatingKey ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setIsCreatingKey(false);
                        setNewKeyName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {loadingKeys ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No active API keys. Create one to integrate WebLens audits into your deployment pipeline.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-y border-slate-800 bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4 font-mono">Prefix</th>
                        <th className="py-2.5 px-4">Created</th>
                        <th className="py-2.5 px-4">Last Used</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {apiKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-200">{k.name}</td>
                          <td className="py-3 px-4 font-mono text-xs text-indigo-400">{k.keyPrefix}</td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {new Date(k.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeApiKey(k.id, k.name)}
                              className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-7 px-2"
                              title="Revoke API key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CI/CD Quick Integration Guides */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Integration Code Snippets
              </CardTitle>
              <CardDescription className="text-xs">
                Copy and run audits directly from your terminal or CI/CD pipelines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Switcher Pills */}
              <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setSnippetPlatform('powershell')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    snippetPlatform === 'powershell'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PowerShell (Windows)
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetPlatform('curl')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    snippetPlatform === 'curl'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  cURL (macOS / Linux)
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetPlatform('github')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    snippetPlatform === 'github'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  GitHub Actions CI
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetPlatform('node')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    snippetPlatform === 'node'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Node.js (Fetch)
                </button>
              </div>

              {/* Code Snippet Display with Copy Button */}
              {snippetPlatform === 'powershell' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Windows PowerShell Command
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(powershellSnippet, 'powershell')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSnippet === 'powershell' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'powershell' ? 'Copied!' : 'Copy Command'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 font-mono text-xs text-slate-300 rounded-lg border border-slate-800 overflow-x-auto">
                    {powershellSnippet}
                  </pre>
                </div>
              )}

              {snippetPlatform === 'curl' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-400" />
                      cURL Command (Bash / Linux / macOS)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(curlSnippet, 'curl')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSnippet === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'curl' ? 'Copied!' : 'Copy cURL'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 font-mono text-xs text-slate-300 rounded-lg border border-slate-800 overflow-x-auto">
                    {curlSnippet}
                  </pre>
                </div>
              )}

              {snippetPlatform === 'github' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                      GitHub Actions Quality Gate (.github/workflows/audit.yml)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(githubActionsSnippet, 'gh')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSnippet === 'gh' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'gh' ? 'Copied!' : 'Copy Workflow'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 font-mono text-xs text-slate-300 rounded-lg border border-slate-800 overflow-x-auto">
                    {githubActionsSnippet}
                  </pre>
                </div>
              )}

              {snippetPlatform === 'node' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-400" />
                      Node.js Script (Fetch API)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(nodeSnippet, 'node')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSnippet === 'node' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'node' ? 'Copied!' : 'Copy Node.js'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 font-mono text-xs text-slate-300 rounded-lg border border-slate-800 overflow-x-auto">
                    {nodeSnippet}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 max-w-2xl">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Application Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Theme and workflow configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Interface Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['dark', 'light', 'system'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      className={`p-3 rounded-xl border text-xs font-medium capitalize text-center transition-all cursor-pointer ${
                        theme === mode
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification & Scheduling defaults */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Email Notifications</div>
                    <div className="text-[11px] text-slate-500">
                      Receive alerts when scheduled audits detect critical security or performance regressions
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
