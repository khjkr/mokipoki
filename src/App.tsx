import React, { useState, useEffect, useRef } from 'react';
import AvatarRenderer, { AvatarConfig, DEFAULT_MOKI, DEFAULT_POKI } from './AvatarRenderer';

interface User {
  id: string;
  handle: string;
  name: string;
  password?: string;
  statusMsg: string;
  jelly: number;
  ruby: number;
  isOnline: boolean;
  lastSeenAt: string;
  avatar: AvatarConfig;
}

interface FriendRequestItem {
  id: string;
  fromUser?: User;
  targetUser?: User;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'bomb' | 'jelly_gift';
  isExploded?: boolean;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('mokipoki_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginHandle, setLoginHandle] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerStep, setRegisterStep] = useState<'info' | 'character'>('info');
  const [regHandle, setRegHandle] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [chosenBase, setChosenBase] = useState<'moki' | 'poki'>('moki');
  
  const [handleCheckStatus, setHandleCheckStatus] = useState<{ checked: boolean; available: boolean; message: string }>({
    checked: false,
    available: false,
    message: ''
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'store' | 'myhome'>('friends');
  const [isFittingRoomOpen, setIsFittingRoomOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendHandleInput, setFriendHandleInput] = useState('');
  const [friendActionMsg, setFriendActionMsg] = useState('');

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mokipoki_push_enabled') === 'true';
  });

  const [friends, setFriends] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestItem[]>([]);

  const [activeFriend, setActiveFriend] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [statusInput, setStatusInput] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const subscribePush = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      
      const res = await fetch('/api/push/vapid-public-key');
      if (!res.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub })
      });
      console.log('Background Web Push subscription active on server');
    } catch (err) {
      console.warn('Push subscription notice:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mokipoki_user', JSON.stringify(currentUser));
      setStatusInput(currentUser.statusMsg);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        subscribePush(currentUser.id);
      }

      const hbInterval = setInterval(() => {
        fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        }).catch(() => {});
      }, 4000);

      return () => clearInterval(hbInterval);
    } else {
      localStorage.removeItem('mokipoki_user');
    }
  }, [currentUser]);

  const fetchFriendsAndRequests = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/friends?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setSentRequests(data.sentRequests || []);
        setReceivedRequests(data.receivedRequests || []);

        if (activeFriend) {
          const updatedActive = (data.friends || []).find((f: User) => f.id === activeFriend.id);
          if (updatedActive) {
            setActiveFriend(updatedActive);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch friends:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchFriendsAndRequests();
      const interval = setInterval(fetchFriendsAndRequests, 3500);
      return () => clearInterval(interval);
    }
  }, [currentUser, activeFriend?.id]);

  const fetchMessages = async () => {
    if (!currentUser || !activeFriend) return;
    try {
      const res = await fetch(`/api/messages?userId=${currentUser.id}&friendId=${activeFriend.id}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
        setIsChatMuted(!!data.isMuted);
      }
    } catch (e) {
      console.warn('Failed to fetch messages:', e);
    }
  };

  useEffect(() => {
    if (activeFriend) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2500);
      return () => clearInterval(interval);
    }
  }, [activeFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCheckDuplicate = async () => {
    if (!regHandle.trim()) {
      setHandleCheckStatus({ checked: true, available: false, message: '@아이디를 입력해주세요.' });
      return false;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/check-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: regHandle })
      });
      const data = await res.json();
      setHandleCheckStatus({ checked: true, available: !!data.available, message: data.message });
      setAuthLoading(false);
      return !!data.available;
    } catch (e) {
      setHandleCheckStatus({ checked: true, available: false, message: '중복 확인 통신 오류' });
      setAuthLoading(false);
      return false;
    }
  };

  const handleGoToCharacterChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!regHandle.trim() || !regName.trim()) {
      setAuthError('아이디와 이름을 입력해주세요.');
      return;
    }
    const isAvail = await handleCheckDuplicate();
    if (isAvail) {
      setRegisterStep('character');
    }
  };

  const handleCompleteRegister = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: regHandle,
          name: regName,
          password: regPassword,
          baseChoice: chosenBase
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || '회원가입 실패');
        setRegisterStep('info');
      } else {
        setCurrentUser(data.user);
        showToast(`🎉 ${data.user.name}님 환영해요!`);
      }
    } catch (e) {
      setAuthError('서버 연결 실패');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginHandle.trim()) {
      setAuthError('@아이디를 입력해주세요.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: loginHandle, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || '로그인 실패');
      } else {
        setCurrentUser(data.user);
        showToast(`환영합니다, ${data.user.name}님! ✨`);
      }
    } catch (e) {
      setAuthError('서버 연결 실패');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickLogin = (handle: string) => {
    setLoginHandle(handle);
    setLoginPassword('demo');
    setAuthLoading(true);
    setAuthError('');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, password: 'demo' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          showToast(`${data.user.name} 계정으로 로그인되었습니다!`);
        } else {
          setAuthError(data.error || '로그인 실패');
        }
      })
      .catch(() => setAuthError('로그인 통신 오류'))
      .finally(() => setAuthLoading(false));
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (e) {}
    setCurrentUser(null);
    setActiveFriend(null);
    setIsSettingsOpen(false);
    showToast('로그아웃 되었습니다.');
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      showToast('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setPushEnabled(true);
        localStorage.setItem('mokipoki_push_enabled', 'true');
        showToast('🔔 백그라운드 웹푸시 알림이 활성화되었습니다!');
        if (currentUser) {
          await subscribePush(currentUser.id);
        }
      } else {
        setPushEnabled(false);
        localStorage.setItem('mokipoki_push_enabled', 'false');
        showToast('알림 권한이 거절되었습니다.');
      }
    } catch (e) {
      console.warn('Notification error:', e);
    }
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !friendHandleInput.trim()) return;
    setFriendActionMsg('');
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, targetHandle: friendHandleInput })
      });
      const data = await res.json();
      if (!res.ok) {
        setFriendActionMsg(data.error || '친구 요청 실패');
      } else {
        setFriendActionMsg(data.message || '친구 요청 완료');
        setFriendHandleInput('');
        fetchFriendsAndRequests();
        showToast('친구 요청이 전송되었습니다! 💌');
      }
    } catch (e) {
      setFriendActionMsg('통신 오류가 발생했습니다.');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        fetchFriendsAndRequests();
        showToast('💚 친구 요청을 수락했습니다!');
      }
    } catch (e) {
      showToast('요청 수락 실패');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId: currentUser.id })
      });
      fetchFriendsAndRequests();
      showToast('친구 요청을 거절했습니다.');
    } catch (e) {}
  };

  const handleDeleteFriend = async (friendId: string, friendName: string) => {
    if (!currentUser) return;
    if (!confirm(`'${friendName}'님을 친구 목록에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/friends/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, friendId })
      });
      if (res.ok) {
        fetchFriendsAndRequests();
        if (activeFriend?.id === friendId) {
          setActiveFriend(null);
        }
        showToast('친구 삭제가 완료되었습니다.');
      }
    } catch (e) {
      showToast('친구 삭제 오류');
    }
  };

  const handleToggleMute = async () => {
    if (!currentUser || !activeFriend) return;
    const nextState = !isChatMuted;
    try {
      const res = await fetch('/api/chat/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, friendId: activeFriend.id, isMuted: nextState })
      });
      if (res.ok) {
        setIsChatMuted(nextState);
        showToast(nextState ? '🔕 이 대화방의 알림이 음소거되었습니다.' : '🔔 대화방 알림을 켭니다.');
      }
    } catch (e) {
      showToast('음소거 설정 변경 실패');
    }
  };

  const handleLeaveChatRoom = async () => {
    if (!currentUser || !activeFriend) return;
    if (!confirm(`'${activeFriend.name}'님과의 대화방을 나가시겠습니까?\n대화 내역이 정리됩니다.`)) return;

    try {
      await fetch('/api/chat/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, friendId: activeFriend.id })
      });
      setActiveFriend(null);
      setChatMessages([]);
      showToast('대화방에서 나갔습니다.');
    } catch (e) {
      showToast('대화방 나가기 실패');
    }
  };

  const handleSendMessage = async (type: 'text' | 'bomb' | 'jelly_gift' = 'text') => {
    if (!currentUser || !activeFriend || !chatInput.trim()) return;

    const textToSend = chatInput.trim();
    setChatInput('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeFriend.id,
          text: textToSend,
          type
        })
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, data.message]);
        if (data.pushTriggered) {
          showToast('📲 상대방에게 백그라운드 푸시 알림이 발송되었어요!');
        }
      }
    } catch (e) {
      showToast('메시지 전송 실패');
    }
  };

  const handleExplodeBomb = async (msgId: string) => {
    try {
      await fetch('/api/messages/explode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgId })
      });
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, isExploded: true } : m));
    } catch (e) {}
  };

  const handleSaveStatus = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, statusMsg: statusInput })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setIsEditingStatus(false);
        showToast('상태 메시지가 변경되었습니다 ✨');
      }
    } catch (e) {}
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col h-[100dvh] max-h-[100dvh] max-w-md mx-auto bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] text-slate-800 shadow-2xl relative overflow-hidden font-sans select-none">
        {toastMsg && (
          <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-slate-900/90 text-white rounded-2xl shadow-xl text-center text-xs font-bold animate-bounce backdrop-blur">
            {toastMsg}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center px-6 py-8 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2 filter drop-shadow">🍡</div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              모키포키 (MokiPoki)
            </h1>
            <p className="text-xs text-amber-900/70 mt-1 font-medium">
              내 분신 캐릭터와 함께 떠나는 인터랙티브 메신저
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-amber-200">
            <div className="flex border-b border-amber-100 mb-5">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2 text-center font-bold text-sm transition-all border-b-2 ${
                  authMode === 'login' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setRegisterStep('info'); setAuthError(''); }}
                className={`flex-1 py-2 text-center font-bold text-sm transition-all border-b-2 ${
                  authMode === 'register' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                새 계정 만들기
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl text-center">
                {authError}
              </div>
            )}

            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">고유 @아이디</label>
                  <input
                    type="text"
                    placeholder="@hyunjun"
                    value={loginHandle}
                    onChange={e => setLoginHandle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium bg-amber-50/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">비밀번호</label>
                  <input
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium bg-amber-50/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all hover:brightness-105"
                >
                  {authLoading ? '로그인 확인 중...' : '모키포키 로그인 ✨'}
                </button>

                <div className="mt-5 pt-4 border-t border-amber-100">
                  <p className="text-[11px] font-bold text-slate-400 mb-2">🧪 테스트용 빠른 로그인:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('@hyunjun')}
                      className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100/80 transition-all"
                    >
                      <div className="font-bold text-xs text-amber-900">현준 계정</div>
                      <div className="text-[10px] text-amber-700">@hyunjun</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('@minji')}
                      className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100/80 transition-all"
                    >
                      <div className="font-bold text-xs text-amber-900">민지 계정</div>
                      <div className="text-[10px] text-amber-700">@minji</div>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {authMode === 'register' && registerStep === 'info' && (
              <form onSubmit={handleGoToCharacterChoice} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    @고유아이디 (영문, 숫자)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="@moki_fan"
                      value={regHandle}
                      onChange={e => {
                        setRegHandle(e.target.value);
                        setHandleCheckStatus({ checked: false, available: false, message: '' });
                      }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium bg-amber-50/30"
                    />
                    <button
                      type="button"
                      onClick={handleCheckDuplicate}
                      disabled={authLoading || !regHandle.trim()}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs hover:bg-amber-200 active:scale-95 transition-all whitespace-nowrap border border-amber-300"
                    >
                      중복 확인
                    </button>
                  </div>
                  {handleCheckStatus.checked && (
                    <p className={`text-[11px] font-bold mt-1.5 ${handleCheckStatus.available ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {handleCheckStatus.available ? '✅ ' : '❌ '}
                      {handleCheckStatus.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">이름 (닉네임)</label>
                  <input
                    type="text"
                    placeholder="예: 뽀키마스터"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium bg-amber-50/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">비밀번호</label>
                  <input
                    type="password"
                    placeholder="비밀번호 설정"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium bg-amber-50/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all hover:brightness-105"
                >
                  다음: 분신 캐릭터 선택하기 →
                </button>
              </form>
            )}

            {authMode === 'register' && registerStep === 'character' && (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Step 2. 캐릭터 선택
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mt-1">
                    어떤 분신과 함께 살고 싶나요?
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setChosenBase('moki')}
                    className={`cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col items-center ${
                      chosenBase === 'moki' ? 'border-amber-500 bg-amber-50 shadow-md scale-102' : 'border-slate-200 hover:border-amber-200'
                    }`}
                  >
                    <div className="w-24 h-24 mb-1">
                      <AvatarRenderer config={DEFAULT_MOKI} size={96} />
                    </div>
                    <div className="font-extrabold text-sm text-amber-900">모키 (Moki)</div>
                    <div className="text-[10px] text-amber-700 text-center">말랑말랑 찹쌀떡 토끼</div>
                  </div>

                  <div
                    onClick={() => setChosenBase('poki')}
                    className={`cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col items-center ${
                      chosenBase === 'poki' ? 'border-amber-500 bg-amber-50 shadow-md scale-102' : 'border-slate-200 hover:border-amber-200'
                    }`}
                  >
                    <div className="w-24 h-24 mb-1">
                      <AvatarRenderer config={DEFAULT_POKI} size={96} />
                    </div>
                    <div className="font-extrabold text-sm text-amber-900">포키 (Poki)</div>
                    <div className="text-[10px] text-amber-700 text-center">탱글탱글 젤리 고양이</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterStep('info')}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    ← 이전 단계
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteRegister}
                    disabled={authLoading}
                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                  >
                    {authLoading ? '입주 준비 중...' : '모키포키 입주 완료하기 🎉'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] max-w-md mx-auto bg-slate-50 text-slate-800 shadow-2xl relative overflow-hidden font-sans select-none">
      {toastMsg && (
        <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-slate-900/90 text-white rounded-2xl shadow-xl text-center text-xs font-bold animate-bounce backdrop-blur">
          {toastMsg}
        </div>
      )}

      {/* Global Top Header (Hidden while in 1:1 chat room to guarantee dedicated chat view) */}
      {!activeFriend && (
        <header className="px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍡</span>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-amber-600 to-rose-500 bg-clip-text text-transparent">
              모키포키
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
              <span>🍇 {currentUser.jelly}</span>
              <span className="text-slate-300">|</span>
              <span>💎 {currentUser.ruby}</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-all text-sm"
              title="설정 및 알림"
            >
              ⚙️
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto ${!activeFriend ? 'pb-16' : ''}`}>
        {activeTab === 'friends' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center overflow-hidden">
                  <AvatarRenderer config={currentUser.avatar} size={64} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm truncate">{currentUser.name}</div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    {currentUser.handle}
                  </span>
                </div>
                {isEditingStatus ? (
                  <div className="flex gap-1 mt-1">
                    <input
                      type="text"
                      value={statusInput}
                      onChange={e => setStatusInput(e.target.value)}
                      className="flex-1 text-xs border rounded-lg px-2 py-0.5"
                    />
                    <button onClick={handleSaveStatus} className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-lg font-bold">
                      저장
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingStatus(true)}
                    className="text-xs text-slate-500 truncate cursor-pointer hover:text-amber-600 mt-0.5 flex items-center gap-1"
                  >
                    <span>{currentUser.statusMsg || '상태 메시지 설정'}</span>
                    <span className="text-[10px] text-slate-400">✏️</span>
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setIsFittingRoomOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 active:scale-95"
                  >
                    꾸미기 ✨
                  </button>
                </div>
              </div>
            </div>

            {receivedRequests.length > 0 && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <span>💌</span>
                    <span>받은 친구 요청 ({receivedRequests.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {receivedRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-2xl p-3 border border-emerald-100 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
                          {req.fromUser && <AvatarRenderer config={req.fromUser.avatar} size={40} />}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-800">{req.fromUser?.name}</div>
                          <div className="text-[10px] text-emerald-700">{req.fromUser?.handle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-extrabold text-[11px] active:scale-95 shadow-xs"
                        >
                          수락 💚
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold text-[11px] hover:bg-slate-200"
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentRequests.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-4 shadow-sm space-y-2.5">
                <h3 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                  <span>⏳</span>
                  <span>보낸 친구 요청 ({sentRequests.length})</span>
                </h3>
                <div className="space-y-2">
                  {sentRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-2xl p-3 border border-amber-100 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden">
                          {req.targetUser && <AvatarRenderer config={req.targetUser.avatar} size={40} />}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-800">{req.targetUser?.name}</div>
                          <div className="text-[10px] text-amber-700">{req.targetUser?.handle}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                        수락 대기중 ⏳
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  내 친구 ({friends.length})
                </h3>
                <button
                  onClick={() => { setIsAddFriendOpen(true); setFriendActionMsg(''); }}
                  className="px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold text-[11px] shadow-sm hover:brightness-105 active:scale-95"
                >
                  + 친구 추가
                </button>
              </div>

              {friends.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-200">
                  <div className="text-3xl mb-1">🐣</div>
                  <div className="text-xs font-bold text-slate-500">아직 등록된 친구가 없어요.</div>
                  <div className="text-[11px] text-slate-400 mt-1">상단의 '+ 친구 추가'로 친구를 사귀어보세요!</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between hover:border-amber-200 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-center overflow-hidden">
                            <AvatarRenderer config={friend.avatar} size={48} />
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            friend.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-800 truncate">{friend.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              friend.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {friend.lastSeenAt}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{friend.handle}</div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{friend.statusMsg}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setActiveFriend(friend); setActiveTab('chat'); }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-extrabold text-[11px] hover:bg-amber-100 active:scale-95"
                        >
                          💬 대화
                        </button>
                        <button
                          onClick={() => handleDeleteFriend(friend.id, friend.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all text-xs"
                          title="친구 삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {activeFriend ? (
              <div className="flex flex-col h-full bg-slate-100 relative">
                {/* STICKY CHAT HEADER: Stays permanently visible above keyboard and messages */}
                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setActiveFriend(null)}
                      className="text-slate-500 hover:text-slate-800 text-base font-extrabold px-1"
                    >
                      ←
                    </button>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 overflow-hidden flex items-center justify-center">
                      <AvatarRenderer config={activeFriend.avatar} size={32} />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-800">{activeFriend.name}</div>
                      <div className="text-[10px] flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeFriend.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-slate-500">{activeFriend.lastSeenAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleMute}
                      className={`px-2 py-1 rounded-xl text-xs font-bold border transition-all ${
                        isChatMuted ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isChatMuted ? '🔕 음소거됨' : '🔔 알림'}
                    </button>
                    <button
                      onClick={handleLeaveChatRoom}
                      className="px-2 py-1 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 font-bold text-xs"
                    >
                      🚪 나가기
                    </button>
                  </div>
                </div>

                {/* SCROLLABLE CHAT MESSAGES */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      {activeFriend.name}님과의 첫 대화를 시작해보세요! 🍡
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                            isMe ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                          }`}>
                            {msg.type === 'bomb' ? (
                              <div>
                                {msg.isExploded ? (
                                  <span className="italic opacity-60">💥 펑! 폭탄 메시지가 폭발했어요</span>
                                ) : (
                                  <div
                                    onClick={() => handleExplodeBomb(msg.id)}
                                    className="cursor-pointer font-bold flex items-center gap-1.5 animate-pulse"
                                  >
                                    <span>💣 폭탄 메시지: {msg.text}</span>
                                    <span className="text-[10px] underline">(터뜨리기)</span>
                                  </div>
                                )}
                              </div>
                            ) : msg.type === 'jelly_gift' ? (
                              <div className="font-bold flex items-center gap-1">
                                <span>🍇 젤리 선물: {msg.text}</span>
                              </div>
                            ) : (
                              <div>{msg.text}</div>
                            )}
                            <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-amber-100' : 'text-slate-400'}`}>
                              {msg.timestamp}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* CHAT INPUT BAR: Sticky at bottom above virtual keyboard */}
                <div className="sticky bottom-0 bg-white p-2.5 border-t border-slate-200 z-30">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendMessage('bomb')}
                      className="p-2 text-sm rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    >
                      💣
                    </button>
                    <button
                      onClick={() => handleSendMessage('jelly_gift')}
                      className="p-2 text-sm rounded-xl bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"
                    >
                      🍇
                    </button>
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage('text')}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={() => handleSendMessage('text')}
                      disabled={!chatInput.trim()}
                      className="px-3.5 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                    >
                      전송
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  진행 중인 대화
                </h3>
                {friends.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    대화할 친구를 먼저 추가해주세요.
                  </div>
                ) : (
                  friends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => setActiveFriend(friend)}
                      className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between hover:border-amber-300 cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 overflow-hidden flex items-center justify-center">
                          <AvatarRenderer config={friend.avatar} size={48} />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-800">{friend.name}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">대화방 입장하기</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-xl font-bold">
                        💬 열기
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'store' && (
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-5 text-white shadow-md">
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                모키포키 백화점
              </span>
              <h2 className="text-lg font-extrabold mt-1">신상 코스튬 컬렉션 🛍️</h2>
              <p className="text-xs text-purple-100 mt-1">젤리와 루비로 나만의 유니크 아바타를 완성하세요!</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: '체리 비니', cost: '🍇 100', icon: '🍒', cat: '모자' },
                { name: '엔젤 날개', cost: '💎 15', icon: '🪽', cat: '장식' },
                { name: '게임보이', cost: '🍇 80', icon: '🎮', cat: '손장식' },
                { name: '하트 풍선', cost: '🍇 50', icon: '🎈', cat: '손장식' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-3.5 border border-slate-100 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
                      {item.cat}
                    </span>
                    <div className="text-2xl my-2 text-center">{item.icon}</div>
                    <div className="font-extrabold text-xs text-slate-800 text-center">{item.name}</div>
                  </div>
                  <button
                    onClick={() => showToast(`${item.name} 구매가 완료되었어요!`)}
                    className="w-full mt-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 active:scale-95"
                  >
                    {item.cost}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'myhome' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-center">
              <div className="w-24 h-24 mx-auto mb-2 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center overflow-hidden">
                <AvatarRenderer config={currentUser.avatar} size={96} />
              </div>
              <h2 className="font-extrabold text-base text-slate-800">{currentUser.name}</h2>
              <p className="text-xs text-amber-700 font-medium">{currentUser.handle}</p>
              <p className="text-xs text-slate-500 mt-1 italic">"{currentUser.statusMsg}"</p>

              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setIsFittingRoomOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-sm hover:brightness-105 active:scale-95"
                >
                  아바타 드레스룸 ✨
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-95"
                >
                  설정 ⚙️
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400">보유 젤리</div>
                <div className="text-lg font-extrabold text-purple-600 mt-0.5">🍇 {currentUser.jelly}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400">보유 루비</div>
                <div className="text-lg font-extrabold text-rose-500 mt-0.5">💎 {currentUser.ruby}</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Bottom Navigation (Hidden while inside active 1:1 chat room) */}
      {!activeFriend && (
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around z-20">
          {[
            { id: 'friends', label: '친구', icon: '👥' },
            { id: 'chat', label: '채팅', icon: '💬' },
            { id: 'store', label: '스토어', icon: '🛍️' },
            { id: 'myhome', label: '마이홈', icon: '🏠' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); if (tab.id !== 'chat') setActiveFriend(null); }}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-amber-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {isSettingsOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <span>⚙️</span>
                <span>모키포키 환경 설정</span>
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-xs text-amber-950">🔔 백그라운드 웹푸시 알림</div>
                  <div className="text-[10px] text-amber-800/80">
                    상태: {notificationPermission === 'granted' ? '✅ 권한 허용됨 (푸시 활성)' : notificationPermission === 'denied' ? '❌ 권한 차단됨' : '⚠️ 미설정'}
                  </div>
                </div>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={handleRequestNotificationPermission}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-white font-extrabold text-[11px] shadow-xs active:scale-95"
                  >
                    권한 허용
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
                <span className="text-xs font-bold text-slate-700">푸시 알림 수신 토글</span>
                <button
                  onClick={async () => {
                    if (notificationPermission !== 'granted') {
                      handleRequestNotificationPermission();
                    } else {
                      const next = !pushEnabled;
                      setPushEnabled(next);
                      localStorage.setItem('mokipoki_push_enabled', String(next));
                      if (next && currentUser) {
                        await subscribePush(currentUser.id);
                      }
                      showToast(next ? '푸시 알림이 활성화되었습니다.' : '푸시 알림이 비활성화되었습니다.');
                    }
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    pushEnabled ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    pushEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-600">내 계정 정보</div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex justify-between">
                <span>{currentUser.name} ({currentUser.handle})</span>
                <span className="text-emerald-600 font-bold">세션 유지 중</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 font-extrabold text-xs hover:bg-rose-100"
              >
                🚪 로그아웃 (세션 초기화)
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2 text-slate-400 font-bold text-xs"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddFriendOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1">
                <span>➕</span>
                <span>친구 요청 보내기</span>
              </h3>
              <button onClick={() => setIsAddFriendOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendFriendRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  상대방 @아이디 입력
                </label>
                <input
                  type="text"
                  placeholder="@아이디 (예: @minji)"
                  value={friendHandleInput}
                  onChange={e => setFriendHandleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm font-medium"
                />
              </div>

              {friendActionMsg && (
                <div className="p-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  {friendActionMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={!friendHandleInput.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md active:scale-95 disabled:opacity-40"
              >
                친구 요청 보내기 💌
              </button>
            </form>
          </div>
        </div>
      )}

      {isFittingRoomOpen && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-800">아바타 드레스룸 ✨</h3>
              <button onClick={() => setIsFittingRoomOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="w-32 h-32 mx-auto rounded-3xl bg-amber-50/70 border border-amber-200 flex items-center justify-center overflow-hidden">
              <AvatarRenderer config={currentUser.avatar} size={128} />
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-600">표정</span>
                <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1">
                  {(['smile', 'wink', 'sparkle', 'drowsy', 'silly'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        const newAv = { ...currentUser.avatar, face: f };
                        setCurrentUser({ ...currentUser, avatar: newAv });
                        fetch('/api/users/avatar', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: currentUser.id, avatar: newAv })
                        });
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border whitespace-nowrap ${
                        currentUser.avatar.face === f ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-600">상의</span>
                <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1">
                  {(['mint_hoodie', 'striped_tee', 'pink_cardigan', 'none'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        const newAv = { ...currentUser.avatar, top: t };
                        setCurrentUser({ ...currentUser, avatar: newAv });
                        fetch('/api/users/avatar', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: currentUser.id, avatar: newAv })
                        });
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border whitespace-nowrap ${
                        currentUser.avatar.top === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-600">모자 / 헤어</span>
                <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1">
                  {(['cherry_beanie', 'cat_ears', 'flower_pin', 'none'] as const).map(h => (
                    <button
                      key={h}
                      onClick={() => {
                        const newAv = { ...currentUser.avatar, headwear: h };
                        setCurrentUser({ ...currentUser, avatar: newAv });
                        fetch('/api/users/avatar', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: currentUser.id, avatar: newAv })
                        });
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border whitespace-nowrap ${
                        currentUser.avatar.headwear === h ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setIsFittingRoomOpen(false); showToast('아바타 변경사항이 저장되었습니다! ✨'); }}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-md active:scale-95"
            >
              드레스룸 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
