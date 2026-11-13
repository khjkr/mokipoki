import React, { useState, useEffect, useRef } from 'react';
import { AvatarRenderer, AvatarConfig, DEFAULT_AVATAR_MOKI, DEFAULT_AVATAR_POKI } from './AvatarRenderer';

// Interfaces
interface User {
  id: string;
  handle: string;
  name: string;
  statusMsg: string;
  jelly: number;
  ruby: number;
  isOnline: boolean;
  lastSeenAt: string;
  avatar: AvatarConfig;
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

export default function App() {
  // 1. MUST START AT NULL: Login / Register Auth Gate appears FIRST on open!
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth Gate Form States
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginHandle, setLoginHandle] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regHandle, setRegHandle] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStep, setRegStep] = useState<'form' | 'onboarding'>('form');
  const [onboardingChoice, setOnboardingChoice] = useState<'moki' | 'poki'>('moki');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // App Navigation
  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'store' | 'profile'>('friends');
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);

  // Real Backend Data States
  const [friends, setFriends] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addHandleInput, setAddHandleInput] = useState('');
  const [showGimmickMenu, setShowGimmickMenu] = useState(false);
  const [pushToast, setPushToast] = useState<string | null>(null);
  const [wardrobeAvatar, setWardrobeAvatar] = useState<AvatarConfig>({ ...DEFAULT_AVATAR_MOKI });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChatFriendId]);

  // Sync Wardrobe avatar
  useEffect(() => {
    if (currentUser) {
      setWardrobeAvatar({ ...currentUser.avatar });
    }
  }, [currentUser]);

  // Real-time Polling for Friends & Messages (Every 2 seconds)
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Friends List
        const resFriends = await fetch(`/api/friends?userId=${currentUser.id}`);
        if (resFriends.ok) {
          const data = await resFriends.json();
          if (data.friends) setFriends(data.friends);
        }

        // 2. Fetch Active Chat Messages if in a room
        if (activeChatFriendId) {
          const resMsgs = await fetch(`/api/messages?userId=${currentUser.id}&friendId=${activeChatFriendId}`);
          if (resMsgs.ok) {
            const data = await resMsgs.json();
            if (data.messages) setChatMessages(data.messages);
          }
        }
      } catch (err) {
        // Fallback for offline/local standalone mode
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [currentUser, activeChatFriendId]);

  // -------------------------------------------------------------
  // AUTH HANDLERS (Connects directly to Backend API)
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: loginHandle.trim(), password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || '로그인에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      setCurrentUser(data.user);
      setIsLoading(false);
      setLoginHandle('');
      setLoginPassword('');
    } catch (err) {
      // Offline fallback: check demo users
      const cleanHandle = loginHandle.trim().startsWith('@') ? loginHandle.trim() : `@${loginHandle.trim()}`;
      if (cleanHandle.toLowerCase() === '@hyunjun') {
        setCurrentUser({
          id: 'user_hyunjun',
          handle: '@hyunjun',
          name: '현준',
          statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
          jelly: 320,
          ruby: 20,
          isOnline: true,
          lastSeenAt: '온라인',
          avatar: { ...DEFAULT_AVATAR_MOKI }
        });
      } else if (cleanHandle.toLowerCase() === '@minji') {
        setCurrentUser({
          id: 'user_minji',
          handle: '@minji',
          name: '민지',
          statusMsg: '체리 비니 새로 샀음 🍒',
          jelly: 150,
          ruby: 5,
          isOnline: true,
          lastSeenAt: '온라인',
          avatar: { ...DEFAULT_AVATAR_POKI }
        });
      } else {
        setAuthError('서버 연결을 확인해주세요. (테스트용 빠른 로그인을 이용할 수도 있습니다)');
      }
      setIsLoading(false);
    }
  };

  const handleRegisterFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!regHandle.trim() || !regName.trim()) {
      setAuthError('아이디와 이름을 입력해주세요.');
      return;
    }
    setRegStep('onboarding');
  };

  const handleFinishRegister = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: regHandle.trim(),
          name: regName.trim(),
          password: regPassword || '1234',
          baseChoice: onboardingChoice
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || '회원가입에 실패했습니다.');
        setRegStep('form');
        setIsLoading(false);
        return;
      }

      setCurrentUser(data.user);
      setRegStep('form');
      setRegHandle('');
      setRegName('');
      setRegPassword('');
      setIsLoading(false);
    } catch (err) {
      // Local fallback create
      const cleanHandle = regHandle.trim().startsWith('@') ? regHandle.trim() : `@${regHandle.trim()}`;
      const fallbackUser: User = {
        id: 'user_' + Date.now(),
        handle: cleanHandle,
        name: regName.trim(),
        statusMsg: '모키포키 새로 입주했어요 🍡',
        jelly: 100,
        ruby: 10,
        isOnline: true,
        lastSeenAt: '온라인',
        avatar: onboardingChoice === 'moki' ? { ...DEFAULT_AVATAR_MOKI } : { ...DEFAULT_AVATAR_POKI }
      };
      setCurrentUser(fallbackUser);
      setRegStep('form');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (handle: string) => {
    setLoginHandle(handle);
    setLoginPassword('demo');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password: 'demo' })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) {
      if (handle === '@hyunjun') {
        setCurrentUser({
          id: 'user_hyunjun',
          handle: '@hyunjun',
          name: '현준',
          statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
          jelly: 320,
          ruby: 20,
          isOnline: true,
          lastSeenAt: '온라인',
          avatar: { ...DEFAULT_AVATAR_MOKI }
        });
      } else {
        setCurrentUser({
          id: 'user_minji',
          handle: '@minji',
          name: '민지',
          statusMsg: '체리 비니 새로 샀음 🍒',
          jelly: 150,
          ruby: 5,
          isOnline: true,
          lastSeenAt: '온라인',
          avatar: { ...DEFAULT_AVATAR_POKI }
        });
      }
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (e) {}
    }
    setCurrentUser(null);
    setActiveChatFriendId(null);
    setFriends([]);
    setChatMessages([]);
  };

  // -------------------------------------------------------------
  // FRIEND & CHAT ACTIONS
  // -------------------------------------------------------------
  const handleAddFriend = async () => {
    if (!currentUser || !addHandleInput.trim()) return;
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetHandle: addHandleInput.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '친구 추가에 실패했습니다.');
        return;
      }
      setFriends(prev => [...prev, data.friend]);
      setAddHandleInput('');
      setShowAddFriend(false);
      alert(`🎉 ${data.friend.name}님을 친구로 추가했습니다!`);
    } catch (err) {
      alert('서버와 통신할 수 없습니다.');
    }
  };

  const handleSendMessage = async (type: 'text' | 'bomb' | 'jelly_gift' = 'text') => {
    if (!currentUser || !activeChatFriendId) return;
    if (type === 'text' && !inputText.trim()) return;

    const textToSend = type === 'text'
      ? inputText.trim()
      : type === 'bomb'
      ? '💣 시크릿 폭탄 메시지!'
      : '🍇 젤리 10개를 선물했습니다!';

    const tempMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      receiverId: activeChatFriendId,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type,
      isExploded: false
    };

    setChatMessages(prev => [...prev, tempMsg]);
    setInputText('');
    setShowGimmickMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = '42px';

    // Reward: +1 Jelly
    setCurrentUser(prev => prev ? { ...prev, jelly: prev.jelly + 1 } : null);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeChatFriendId,
          text: textToSend,
          type
        })
      });
      const data = await res.json();
      if (data.pushTriggered) {
        setPushToast(`📲 [백그라운드 웹푸시 발송] 상대방(${data.receiverName || '친구'})이 오프라인 상태여서 잠금화면으로 알림을 전송했습니다!`);
        setTimeout(() => setPushToast(null), 3800);
      }
    } catch (err) {
      // Local fallback push simulation
      const activeF = friends.find(f => f.id === activeChatFriendId);
      if (!activeF?.isOnline) {
        setPushToast(`📲 [백그라운드 웹푸시 발송] ${activeF?.name}님이 오프라인 상태여서 잠금화면으로 알림을 전송했습니다!`);
        setTimeout(() => setPushToast(null), 3800);
      }
    }
  };

  const handleExplodeBomb = async (msgId: string) => {
    setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, isExploded: true } : m));
    try {
      await fetch('/api/messages/explode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgId })
      });
    } catch (e) {}
  };

  const activeFriend = friends.find(f => f.id === activeChatFriendId);

  return (
    <div className="flex justify-center bg-[#18181B] min-h-screen text-[#2B2321] font-sans antialiased">
      {/* Mobile PWA Shell (430px) */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative overflow-hidden">
        
        <style>{`
          @keyframes avatarFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          .avatar-float { animation: avatarFloat 2.6s ease-in-out infinite; }
          @keyframes popIn {
            0% { transform: scale(0.92); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .pop-in { animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        `}</style>

        {/* PUSH NOTIFICATION TOAST BANNER */}
        {pushToast && (
          <div className="fixed top-14 left-4 right-4 max-w-[400px] mx-auto z-50 bg-[#2B2321] text-white p-3.5 rounded-2xl shadow-2xl border border-[#FF6B6B] text-[13px] leading-snug pop-in flex items-center gap-2.5">
            <span className="text-[20px]">📲</span>
            <div className="flex-1 font-medium">{pushToast}</div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. AUTH GATE SCREEN (Shown when currentUser is NULL) */}
        {/* ============================================================== */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col p-6 justify-between min-h-screen bg-gradient-to-b from-[#FFF5F5] to-[#FFFBF7] pop-in">
            {regStep === 'form' ? (
              <>
                <div className="text-center mt-6">
                  <div className="text-[52px] animate-bounce mb-1">🍡</div>
                  <h1 className="text-[26px] font-black text-[#FF6B6B] tracking-tight">
                    모키포키 (MokiPoki)
                  </h1>
                  <p className="text-[13px] text-[#786963] mt-1 font-medium">
                    내 분신 캐릭터와 함께 떠나는 인터랙티브 메신저
                  </p>
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] p-3 rounded-2xl text-[12px] text-[#991B1B] font-bold text-center mt-3 pop-in">
                    {authError}
                  </div>
                )}

                {/* Auth Mode Tabs */}
                <div className="bg-[#F5ECE5] p-1 rounded-2xl flex my-5">
                  <button
                    onClick={() => { setAuthTab('login'); setAuthError(null); }}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[14px] transition-all ${
                      authTab === 'login' ? 'bg-white text-[#FF6B6B] shadow-sm' : 'text-[#786963]'
                    }`}
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => { setAuthTab('register'); setAuthError(null); }}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[14px] transition-all ${
                      authTab === 'register' ? 'bg-white text-[#FF6B6B] shadow-sm' : 'text-[#786963]'
                    }`}
                  >
                    새 계정 만들기
                  </button>
                </div>

                {/* Form Body */}
                {authTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-3">
                    <div>
                      <label className="text-[12px] font-bold text-[#5C4D47] ml-1">@고유아이디</label>
                      <input
                        type="text"
                        value={loginHandle}
                        onChange={e => setLoginHandle(e.target.value)}
                        placeholder="@아이디 입력 (예: @hyunjun)"
                        required
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#5C4D47] ml-1">비밀번호</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="비밀번호"
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-2xl bg-[#FF6B6B] text-white font-extrabold text-[15px] shadow-md mt-2 active:scale-98 disabled:opacity-50"
                    >
                      {isLoading ? '로그인 중...' : '모키포키 로그인 ✨'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterFormSubmit} className="space-y-3">
                    <div>
                      <label className="text-[12px] font-bold text-[#5C4D47] ml-1">사용할 @고유아이디</label>
                      <input
                        type="text"
                        value={regHandle}
                        onChange={e => setRegHandle(e.target.value)}
                        placeholder="@아이디 (예: @hyunjun_new)"
                        required
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#5C4D47] ml-1">닉네임 / 이름</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="친구들에게 보일 이름"
                        required
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#5C4D47] ml-1">비밀번호</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="간단한 비밀번호"
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-2xl bg-[#FF6B6B] text-white font-extrabold text-[15px] shadow-md mt-2 active:scale-98"
                    >
                      캐릭터 고르러 가기 (2단계) ➡️
                    </button>
                  </form>
                )}

                {/* Quick Account Test Login */}
                <div className="mt-8 pt-4 border-t border-[#F0E6DE]">
                  <div className="text-[12px] font-bold text-[#786963] text-center mb-2.5">
                    🧪 테스트용 빠른 로그인:
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleQuickLogin('@hyunjun')}
                      className="p-3 rounded-2xl bg-white border border-[#FED7AA] flex items-center gap-2.5 shadow-sm active:scale-95 text-left"
                    >
                      <AvatarRenderer config={DEFAULT_AVATAR_MOKI} size={36} animated={false} />
                      <div>
                        <div className="font-bold text-[13px] text-[#2B2321]">현준 계정</div>
                        <div className="text-[11px] text-[#FF6B6B]">@hyunjun</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleQuickLogin('@minji')}
                      className="p-3 rounded-2xl bg-white border border-[#FED7AA] flex items-center gap-2.5 shadow-sm active:scale-95 text-left"
                    >
                      <AvatarRenderer config={DEFAULT_AVATAR_POKI} size={36} animated={false} />
                      <div>
                        <div className="font-bold text-[13px] text-[#2B2321]">민지 계정</div>
                        <div className="text-[11px] text-[#FF6B6B]">@minji</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Onboarding Scene: Choose Moki or Poki */
              <div className="flex-1 flex flex-col items-center justify-between py-4 pop-in">
                <div className="text-center mt-6">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#FFE5D9] text-[#E76F51]">
                    STEP 2 · 캐릭터 선택
                  </span>
                  <h2 className="text-[22px] font-black mt-2 text-[#2B2321]">
                    {regName}님의 단짝 캐릭터를 골라줘! 👯‍♀️
                  </h2>
                </div>

                <div className="flex flex-col items-center my-4">
                  <AvatarRenderer
                    config={onboardingChoice === 'moki' ? DEFAULT_AVATAR_MOKI : DEFAULT_AVATAR_POKI}
                    size={200}
                    animated={true}
                  />
                  <div className="mt-3 font-black text-[18px] text-[#FF6B6B]">
                    {onboardingChoice === 'moki' ? '🍡 순둥 찹쌀떡 모키 (Moki)' : '🐰 장난꾸러기 포키 (Poki)'}
                  </div>
                </div>

                <div className="w-full space-y-2.5 mb-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setOnboardingChoice('moki')}
                      className={`py-3 rounded-2xl font-bold text-[14px] border-2 transition-all ${
                        onboardingChoice === 'moki'
                          ? 'bg-[#FFE5D9] border-[#E76F51] text-[#E76F51] shadow-sm'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      }`}
                    >
                      🍡 모키 선택
                    </button>
                    <button
                      onClick={() => setOnboardingChoice('poki')}
                      className={`py-3 rounded-2xl font-bold text-[14px] border-2 transition-all ${
                        onboardingChoice === 'poki'
                          ? 'bg-[#FFE5D9] border-[#E76F51] text-[#E76F51] shadow-sm'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      }`}
                    >
                      🐰 포키 선택
                    </button>
                  </div>
                  <button
                    onClick={handleFinishRegister}
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl bg-[#FF6B6B] text-white font-black text-[16px] shadow-lg active:scale-98"
                  >
                    {isLoading ? '가입 중...' : '이 캐릭터로 입주 완료! ✨'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (

        // ==============================================================
        // 2. AUTHENTICATED REAL APP SHELL
        // ==============================================================
          <>
            {/* TOP HEADER */}
            <header
              className="sticky top-0 z-30 bg-[#FFFBF7]/90 backdrop-blur-md px-5 pb-3 border-b border-[#F0E6DE] flex items-center justify-between"
              style={{ paddingTop: 'max(48px, env(safe-area-inset-top, 48px))' }}
            >
              {activeChatFriendId ? (
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setActiveChatFriendId(null)}
                    className="w-9 h-9 rounded-full bg-[#F5ECE5] flex items-center justify-center text-[#2B2321] active:scale-95 transition-transform"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <AvatarRenderer config={activeFriend?.avatar || DEFAULT_AVATAR_POKI} size={38} animated={false} />
                    <div>
                      <div className="font-bold text-[16px] leading-tight flex items-center gap-1.5">
                        {activeFriend?.name}
                        {activeFriend?.isOnline ? (
                          <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#10B981]" /> 온라인
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[#9CA3AF]">
                            ⚪ {activeFriend?.lastSeenAt}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#8C7A74]">{activeFriend?.handle}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-black tracking-tight text-[#FF6B6B] flex items-center gap-1">
                      🍡 모키포키
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] active:scale-95"
                    >
                      로그아웃 🚪
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-[#FFF0E6] px-3 py-1 rounded-full border border-[#FED7AA]">
                    <span className="text-[13px] font-extrabold text-[#D97706]">🍇 {currentUser.jelly}</span>
                    <span className="text-[11px] text-[#A8A29E]">|</span>
                    <span className="text-[13px] font-extrabold text-[#EF4444]">💎 {currentUser.ruby}</span>
                  </div>
                </>
              )}
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">

              {/* ----------------- CHAT ROOM VIEW ----------------- */}
              {activeChatFriendId ? (
                <div className="flex flex-col gap-3 min-h-full">
                  <div className="text-center my-2">
                    <span className="text-[11px] bg-[#EFE7E1] text-[#786963] px-3 py-1 rounded-full font-medium">
                      {activeFriend?.name}님과의 대화방입니다
                    </span>
                  </div>

                  {chatMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    const avatar = isMe ? currentUser.avatar : activeFriend?.avatar || DEFAULT_AVATAR_POKI;

                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <AvatarRenderer config={avatar} size={38} animated={false} />
                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {msg.type === 'bomb' ? (
                            <div
                              onClick={() => !msg.isExploded && handleExplodeBomb(msg.id)}
                              className={`p-3 rounded-2xl cursor-pointer transition-all ${
                                msg.isExploded
                                  ? 'bg-[#FEE2E2] border-2 border-dashed border-[#EF4444] text-[#991B1B]'
                                  : 'bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white shadow-lg active:scale-95'
                              }`}
                            >
                              {msg.isExploded ? (
                                <div className="font-bold text-[14px]">💥 펑! 비밀 메시지가 폭파되었습니다!</div>
                              ) : (
                                <div className="font-bold text-[14px] flex items-center gap-1.5 animate-pulse">
                                  💣 탭하여 폭탄 메시지 열기!
                                </div>
                              )}
                            </div>
                          ) : msg.type === 'jelly_gift' ? (
                            <div className="bg-[#FEF3C7] border border-[#FCD34D] p-3 rounded-2xl text-[#92400E] font-bold text-[14px] shadow-sm flex items-center gap-2">
                              <span className="text-[20px]">🍇</span>
                              <span>{msg.text}</span>
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed break-words shadow-sm ${
                                isMe
                                  ? 'bg-[#FF6B6B] text-white rounded-br-none'
                                  : 'bg-white text-[#2B2321] border border-[#EFE5DC] rounded-bl-none'
                              }`}
                            >
                              {msg.text}
                            </div>
                          )}
                          <span className="text-[10px] text-[#A89F91] mt-1 px-1">{msg.timestamp}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : null}

              {/* ----------------- TAB 1: FRIENDS (친구 목록) ----------------- */}
              {!activeChatFriendId && activeTab === 'friends' && (
                <div className="flex flex-col gap-4 pop-in">
                  
                  {/* My Profile Card */}
                  <div className="bg-gradient-to-r from-[#FFF0E6] to-[#FFE5D9] p-4 rounded-3xl border border-[#FED7AA] flex items-center gap-4 shadow-sm">
                    <AvatarRenderer config={currentUser.avatar} size={68} />
                    <div className="flex-1">
                      <div className="font-extrabold text-[17px] text-[#2B2321] flex items-center gap-1.5">
                        {currentUser.name}
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      </div>
                      <div className="text-[12px] text-[#FF6B6B] font-semibold">{currentUser.handle}</div>
                      <div className="text-[12px] text-[#786963] mt-0.5">{currentUser.statusMsg}</div>
                    </div>
                    <button
                      onClick={() => {
                        setWardrobeAvatar({ ...currentUser.avatar });
                        setActiveTab('store');
                      }}
                      className="px-3 py-1.5 rounded-full bg-white text-[12px] font-bold text-[#E76F51] border border-[#FED7AA] shadow-sm active:scale-95"
                    >
                      꾸미기 ✨
                    </button>
                  </div>

                  {/* Friends Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="font-extrabold text-[15px] text-[#5C4D47]">
                      내 친구 ({friends.length})
                    </span>
                    <button
                      onClick={() => setShowAddFriend(true)}
                      className="flex items-center gap-1 text-[13px] font-bold text-[#FF6B6B] active:scale-95"
                    >
                      <span className="text-[16px]">+</span> 친구 추가
                    </button>
                  </div>

                  {/* Friends List */}
                  <div className="flex flex-col gap-2.5">
                    {friends.length === 0 ? (
                      <div className="text-center py-8 text-[#A89F91] text-[13px]">
                        아직 추가된 친구가 없어요. 상단의 [+ 친구 추가]를 눌러보세요!
                      </div>
                    ) : (
                      friends.map(friend => (
                        <div
                          key={friend.id}
                          onClick={() => setActiveChatFriendId(friend.id)}
                          className="bg-white p-3.5 rounded-2xl border border-[#F0E6DE] flex items-center gap-3.5 shadow-sm active:bg-[#FFF9F5] transition-colors cursor-pointer"
                        >
                          <div className="relative">
                            <AvatarRenderer config={friend.avatar} size={50} animated={false} />
                            {friend.isOnline ? (
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#10B981] border-2 border-white rounded-full shadow-sm" />
                            ) : (
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#D1D5DB] border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[15px] text-[#2B2321] flex items-center gap-1.5">
                                {friend.name}
                                {friend.isOnline ? (
                                  <span className="text-[10px] font-bold text-[#10B981]">온라인</span>
                                ) : (
                                  <span className="text-[10px] text-[#9CA3AF] font-normal">{friend.lastSeenAt}</span>
                                )}
                              </span>
                              <span className="text-[11px] text-[#A89F91]">{friend.handle}</span>
                            </div>
                            <div className="text-[12px] text-[#786963] truncate mt-0.5">{friend.statusMsg}</div>
                          </div>
                          <button className="w-8 h-8 rounded-full bg-[#FFF0E6] text-[#E76F51] flex items-center justify-center font-bold text-[13px]">
                            💬
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ----------------- TAB 2: CHAT LIST ----------------- */}
              {!activeChatFriendId && activeTab === 'chat' && (
                <div className="flex flex-col gap-3 pop-in">
                  <div className="font-extrabold text-[18px] text-[#2B2321] mb-1">채팅 목록</div>
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => setActiveChatFriendId(friend.id)}
                      className="bg-white p-4 rounded-2xl border border-[#F0E6DE] flex items-center gap-3.5 shadow-sm active:bg-[#FFF9F5] transition-colors cursor-pointer"
                    >
                      <div className="relative">
                        <AvatarRenderer config={friend.avatar} size={50} animated={false} />
                        {friend.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[16px] text-[#2B2321]">{friend.name}</span>
                          <span className="text-[11px] text-[#A89F91]">대화 열기</span>
                        </div>
                        <div className="text-[13px] text-[#786963] truncate mt-1">
                          {friend.statusMsg}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ----------------- TAB 3: STORE & WARDROBE ----------------- */}
              {!activeChatFriendId && activeTab === 'store' && (
                <div className="flex flex-col gap-4 pop-in">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[18px]">🛍️ 모키포키 드레스룸</span>
                    <button
                      onClick={() => {
                        setCurrentUser(prev => prev ? { ...prev, avatar: { ...wardrobeAvatar } } : null);
                        alert('🎉 아바타 코디가 저장되었습니다!');
                      }}
                      className="px-4 py-1.5 rounded-full bg-[#FF6B6B] text-white font-extrabold text-[13px] shadow-md active:scale-95"
                    >
                      착용 저장 ✨
                    </button>
                  </div>

                  <div className="bg-gradient-to-b from-[#FFF0E6] to-[#FFFFFF] p-6 rounded-3xl border-2 border-[#FED7AA] flex flex-col items-center justify-center relative shadow-inner">
                    <AvatarRenderer config={wardrobeAvatar} size={190} animated={true} />
                    <div className="mt-2 text-[13px] font-bold text-[#E76F51]">
                      {wardrobeAvatar.base === 'moki' ? '말랑 찹쌀떡 모키 (Moki)' : '호기심 말썽꾸러기 포키 (Poki)'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setWardrobeAvatar(prev => ({ ...prev, base: 'moki' }))}
                      className={`py-2.5 rounded-2xl font-bold text-[14px] border transition-all ${
                        wardrobeAvatar.base === 'moki'
                          ? 'bg-[#FFE5D9] border-[#E76F51] text-[#E76F51] shadow-sm'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      }`}
                    >
                      🍡 모키 (Moki)
                    </button>
                    <button
                      onClick={() => setWardrobeAvatar(prev => ({ ...prev, base: 'poki' }))}
                      className={`py-2.5 rounded-2xl font-bold text-[14px] border transition-all ${
                        wardrobeAvatar.base === 'poki'
                          ? 'bg-[#FFE5D9] border-[#E76F51] text-[#E76F51] shadow-sm'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      }`}
                    >
                      🐰 포키 (Poki)
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="font-bold text-[14px] text-[#5C4D47]">😊 표정 파츠</div>
                    <div className="grid grid-cols-5 gap-2">
                      {(['smile', 'wink', 'sparkle', 'drowsy', 'silly'] as const).map(face => (
                        <button
                          key={face}
                          onClick={() => setWardrobeAvatar(prev => ({ ...prev, face }))}
                          className={`p-2 rounded-2xl border text-[12px] font-bold capitalize transition-all ${
                            wardrobeAvatar.face === face
                              ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                              : 'bg-white border-[#E5E7EB] text-[#4B5563]'
                          }`}
                        >
                          {face === 'smile' ? '미소' : face === 'wink' ? '윙크' : face === 'sparkle' ? '반짝' : face === 'drowsy' ? '졸림' : '장난'}
                        </button>
                      ))}
                    </div>

                    <div className="font-bold text-[14px] text-[#5C4D47] mt-1">👒 모자 & 헤어</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cherry_beanie', label: '🍒 체리 비니' },
                        { id: 'cat_ears', label: '🐱 고양이 귀' },
                        { id: 'round_glasses', label: '👓 동글 안경' },
                        { id: 'none', label: '❌ 모자 벗기' }
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => setWardrobeAvatar(prev => ({ ...prev, headwear: item.id as any }))}
                          className={`p-2.5 rounded-2xl border text-[13px] font-bold transition-all ${
                            wardrobeAvatar.headwear === item.id
                              ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                              : 'bg-white border-[#E5E7EB] text-[#4B5563]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="font-bold text-[14px] text-[#5C4D47] mt-1">👕 상의 의상</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mint_hoodie', label: '🩵 민트 후드' },
                        { id: 'yellow_knit', label: '💛 옐로우 니트' },
                        { id: 'striped_tee', label: '❤️ 줄무늬 티' },
                        { id: 'none', label: '❌ 기본 옷' }
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => setWardrobeAvatar(prev => ({ ...prev, top: item.id as any }))}
                          className={`p-2.5 rounded-2xl border text-[13px] font-bold transition-all ${
                            wardrobeAvatar.top === item.id
                              ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                              : 'bg-white border-[#E5E7EB] text-[#4B5563]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- TAB 4: PROFILE ----------------- */}
              {!activeChatFriendId && activeTab === 'profile' && (
                <div className="flex flex-col gap-4 pop-in">
                  <div className="bg-white p-6 rounded-3xl border border-[#F0E6DE] flex flex-col items-center shadow-sm">
                    <AvatarRenderer config={currentUser.avatar} size={150} animated={true} />
                    <div className="font-black text-[20px] text-[#2B2321] mt-2">{currentUser.name}</div>
                    <div className="text-[13px] font-bold text-[#FF6B6B]">{currentUser.handle}</div>
                    <div className="text-[13px] text-[#786963] mt-1 text-center bg-[#FDF6F0] px-4 py-2 rounded-2xl w-full">
                      "{currentUser.statusMsg}"
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full mt-4">
                      <div className="bg-[#FFF8E7] p-3 rounded-2xl border border-[#FDE68A] text-center">
                        <div className="text-[11px] font-bold text-[#D97706]">내 보유 젤리</div>
                        <div className="text-[18px] font-black text-[#B45309]">🍇 {currentUser.jelly}</div>
                      </div>
                      <div className="bg-[#FEE2E2] p-3 rounded-2xl border border-[#FECACA] text-center">
                        <div className="text-[11px] font-bold text-[#DC2626]">내 보유 루비</div>
                        <div className="text-[18px] font-black text-[#B91C1C]">💎 {currentUser.ruby}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* CHAT INPUT BAR */}
            {activeChatFriendId && (
              <div
                className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 backdrop-blur-md px-3 pt-2 pb-4 border-t border-[#F0E6DE] z-40"
                style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
              >
                {showGimmickMenu && (
                  <div className="bg-white rounded-2xl p-2.5 mb-2 shadow-xl border border-[#FED7AA] flex gap-2 pop-in">
                    <button
                      onClick={() => handleSendMessage('bomb')}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white font-bold text-[12px] active:scale-95"
                    >
                      💣 폭탄 메시지
                    </button>
                    <button
                      onClick={() => handleSendMessage('jelly_gift')}
                      className="flex-1 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E] font-bold text-[12px] border border-[#FCD34D] active:scale-95"
                    >
                      🍇 젤리 10개 쏘기
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGimmickMenu(prev => !prev)}
                    className="w-10 h-10 rounded-full bg-[#FFF0E6] text-[#E76F51] font-black text-[18px] flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value);
                      e.target.style.height = '42px';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage('text');
                      }
                    }}
                    placeholder={activeFriend?.isOnline ? "메시지를 입력하세요 (전송 시 젤리 +1)..." : "상대방이 오프라인입니다 (푸시 발송)..."}
                    rows={1}
                    className="flex-1 bg-[#F5ECE5] text-[#2B2321] placeholder-[#A89F91] text-[15px] px-4 py-2.5 rounded-2xl outline-none resize-none leading-tight"
                    style={{ height: '42px', maxHeight: '100px' }}
                  />
                  <button
                    onClick={() => handleSendMessage('text')}
                    className="w-10 h-10 rounded-full bg-[#FF6B6B] text-white flex items-center justify-center shadow-md active:scale-95"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* BOTTOM NAVIGATION BAR */}
            {!activeChatFriendId && (
              <nav
                className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 backdrop-blur-md border-t border-[#F0E6DE] z-30 flex justify-around items-center pt-2"
                style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))' }}
              >
                {[
                  { id: 'friends', label: '친구', icon: '👥' },
                  { id: 'chat', label: '채팅', icon: '💬' },
                  { id: 'store', label: '스토어', icon: '🛍️' },
                  { id: 'profile', label: '마이홈', icon: '🏠' }
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-all ${
                        isActive ? 'scale-105' : 'opacity-60'
                      }`}
                    >
                      <span className="text-[20px]">{tab.icon}</span>
                      <span className={`text-[11px] font-bold ${isActive ? 'text-[#FF6B6B]' : 'text-[#786963]'}`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* ADD FRIEND MODAL */}
            {showAddFriend && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-xs p-5 rounded-3xl shadow-2xl border border-[#FED7AA] pop-in">
                  <div className="font-extrabold text-[17px] text-[#2B2321] mb-1">새 친구 추가</div>
                  <div className="text-[12px] text-[#786963] mb-3">인스타그램처럼 @고유아이디를 입력하세요</div>
                  <input
                    type="text"
                    value={addHandleInput}
                    onChange={e => setAddHandleInput(e.target.value)}
                    placeholder="@아이디 입력 (예: @minji, @hyunjun)"
                    className="w-full bg-[#F5ECE5] px-4 py-2.5 rounded-xl text-[14px] outline-none mb-4 font-medium"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddFriend(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#F3F4F6] text-[#4B5563] font-bold text-[13px]"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddFriend}
                      className="flex-1 py-2.5 rounded-xl bg-[#FF6B6B] text-white font-bold text-[13px] shadow-sm"
                    >
                      추가하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
