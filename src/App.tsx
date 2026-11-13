import React, { useState, useEffect, useRef } from 'react';
import { AvatarRenderer, AvatarConfig, DEFAULT_AVATAR_MOKI, DEFAULT_AVATAR_POKI } from './AvatarRenderer';

// Interfaces
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

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'bomb' | 'jelly_gift';
  isExploded?: boolean;
}

// Initial Global Mock DB (Shared across logins in session)
const INITIAL_USERS: User[] = [
  {
    id: 'user_hyunjun',
    handle: '@hyunjun',
    name: '현준',
    password: 'demo',
    statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
    jelly: 320,
    ruby: 20,
    isOnline: true,
    lastSeenAt: '온라인',
    avatar: { ...DEFAULT_AVATAR_MOKI }
  },
  {
    id: 'user_minji',
    handle: '@minji',
    name: '민지',
    password: 'demo',
    statusMsg: '체리 비니 새로 샀음 🍒',
    jelly: 150,
    ruby: 5,
    isOnline: false,
    lastSeenAt: '방금 전',
    avatar: { ...DEFAULT_AVATAR_POKI }
  },
  {
    id: 'user_junho',
    handle: '@junho',
    name: '준호',
    password: 'demo',
    statusMsg: '오목 한판 뜰 사람 구함 🕹️',
    jelly: 80,
    ruby: 0,
    isOnline: false,
    lastSeenAt: '12분 전',
    avatar: {
      base: 'moki',
      face: 'sparkle',
      top: 'yellow_knit',
      headwear: 'round_glasses',
      handheld: 'gameboy',
      bg: 'pastel_circle',
      effect: 'sparkles'
    }
  }
];

const INITIAL_FRIENDSHIPS: [string, string][] = [
  ['user_hyunjun', 'user_minji'],
  ['user_minji', 'user_hyunjun'],
  ['user_hyunjun', 'user_junho'],
  ['user_junho', 'user_hyunjun']
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    senderId: 'user_minji',
    receiverId: 'user_hyunjun',
    text: '현준아 모키포키 들어왔어? 대박 귀여워 ㅋㅋㅋ',
    timestamp: '18:40',
    type: 'text'
  },
  {
    id: 'm2',
    senderId: 'user_hyunjun',
    receiverId: 'user_minji',
    text: '응응! 나 방금 찹쌀떡 모키로 캐릭터 만들었음!',
    timestamp: '18:41',
    type: 'text'
  },
  {
    id: 'm3',
    senderId: 'user_minji',
    receiverId: 'user_hyunjun',
    text: '이거 탭하면 터지는 폭탄 메시지다! 💣',
    timestamp: '18:41',
    type: 'bomb',
    isExploded: false
  }
];

export default function App() {
  // Global In-Memory Stores
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [friendships, setFriendships] = useState<[string, string][]>(INITIAL_FRIENDSHIPS);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0]); // default to Hyun-jun for instant view
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginHandle, setLoginHandle] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regHandle, setRegHandle] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStep, setRegStep] = useState<'form' | 'onboarding'>('form');
  const [onboardingChoice, setOnboardingChoice] = useState<'moki' | 'poki'>('moki');

  // App Navigation
  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'store' | 'profile'>('friends');
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);

  // Chat & UI states
  const [inputText, setInputText] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addHandleInput, setAddHandleInput] = useState('');
  const [showGimmickMenu, setShowGimmickMenu] = useState(false);
  const [pushToast, setPushToast] = useState<string | null>(null);
  const [wardrobeAvatar, setWardrobeAvatar] = useState<AvatarConfig>({ ...DEFAULT_AVATAR_MOKI });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync Wardrobe avatar when current user changes
  useEffect(() => {
    if (currentUser) {
      setWardrobeAvatar({ ...currentUser.avatar });
    }
  }, [currentUser]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, activeChatFriendId]);

  // Handle Login
  const handleLoginSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanHandle = loginHandle.trim().startsWith('@') ? loginHandle.trim() : `@${loginHandle.trim()}`;
    const user = allUsers.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

    if (!user) {
      alert('가입되지 않은 @아이디입니다. 회원가입을 먼저 진행해주세요!');
      return;
    }
    if (loginPassword && user.password && user.password !== loginPassword) {
      alert('비밀번호가 올바르지 않습니다.');
      return;
    }

    // Mark user online
    setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, isOnline: true, lastSeenAt: '온라인' } : u));
    setCurrentUser({ ...user, isOnline: true, lastSeenAt: '온라인' });
    setLoginHandle('');
    setLoginPassword('');
    setActiveChatFriendId(null);
  };

  // Handle Quick Demo Login
  const handleQuickLogin = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    // Mark previous user offline, new user online
    setAllUsers(prev => prev.map(u => {
      if (currentUser && u.id === currentUser.id) return { ...u, isOnline: false, lastSeenAt: '방금 전' };
      if (u.id === user.id) return { ...u, isOnline: true, lastSeenAt: '온라인' };
      return u;
    }));

    setCurrentUser({ ...user, isOnline: true, lastSeenAt: '온라인' });
    setActiveChatFriendId(null);
  };

  // Handle Logout
  const handleLogout = () => {
    if (currentUser) {
      setAllUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, isOnline: false, lastSeenAt: '방금 전' } : u));
    }
    setCurrentUser(null);
    setActiveChatFriendId(null);
  };

  // Handle Register Step 1
  const handleRegisterFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = regHandle.trim().startsWith('@') ? regHandle.trim() : `@${regHandle.trim()}`;
    if (!cleanHandle || !regName.trim()) {
      alert('아이디와 이름을 모두 입력해주세요.');
      return;
    }
    if (allUsers.some(u => u.handle.toLowerCase() === cleanHandle.toLowerCase())) {
      alert('이미 사용 중인 @아이디입니다. 다른 아이디를 입력해주세요.');
      return;
    }
    setRegStep('onboarding');
  };

  // Handle Register Step 2: Onboarding Complete
  const handleFinishRegister = () => {
    const cleanHandle = regHandle.trim().startsWith('@') ? regHandle.trim() : `@${regHandle.trim()}`;
    const newUser: User = {
      id: 'user_' + Date.now(),
      handle: cleanHandle,
      name: regName.trim(),
      password: regPassword || '1234',
      statusMsg: '모키포키 새로 입주했어요 🍡',
      jelly: 100,
      ruby: 10,
      isOnline: true,
      lastSeenAt: '온라인',
      avatar: onboardingChoice === 'moki' ? { ...DEFAULT_AVATAR_MOKI } : { ...DEFAULT_AVATAR_POKI }
    };

    // Auto friend with existing demo users for immediate fun
    setAllUsers(prev => [...prev, newUser]);
    setFriendships(prev => [
      ...prev,
      [newUser.id, 'user_hyunjun'],
      ['user_hyunjun', newUser.id],
      [newUser.id, 'user_minji'],
      ['user_minji', newUser.id]
    ]);

    setCurrentUser(newUser);
    setRegStep('form');
    setRegHandle('');
    setRegName('');
    setRegPassword('');
    alert(`🎉 환영합니다, ${newUser.name}님! 모키포키 입주가 완료되었습니다!`);
  };

  // Add Friend Handler
  const handleAddFriend = () => {
    if (!currentUser) return;
    const cleanHandle = addHandleInput.trim().startsWith('@') ? addHandleInput.trim() : `@${addHandleInput.trim()}`;
    const target = allUsers.find(u => u.handle.toLowerCase() === cleanHandle.toLowerCase());

    if (!target) {
      alert('해당 @아이디를 가진 사용자를 찾을 수 없습니다.');
      return;
    }
    if (target.id === currentUser.id) {
      alert('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }

    const already = friendships.some(([u1, u2]) => u1 === currentUser.id && u2 === target.id);
    if (already) {
      alert('이미 친구로 등록되어 있습니다.');
      return;
    }

    setFriendships(prev => [...prev, [currentUser.id, target.id], [target.id, currentUser.id]]);
    setAddHandleInput('');
    setShowAddFriend(false);
    alert(`🎉 ${target.name}님을 친구로 추가했습니다!`);
  };

  // Send Message Handler
  const handleSendMessage = (type: 'text' | 'bomb' | 'jelly_gift' = 'text') => {
    if (!currentUser || !activeChatFriendId) return;
    if (type === 'text' && !inputText.trim()) return;

    const targetFriend = allUsers.find(u => u.id === activeChatFriendId);
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      receiverId: activeChatFriendId,
      text: type === 'text' ? inputText.trim() : type === 'bomb' ? '💣 시크릿 폭탄 메시지!' : '🍇 젤리 10개를 선물했습니다!',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type,
      isExploded: false
    };

    setAllMessages(prev => [...prev, newMsg]);
    setInputText('');
    setShowGimmickMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = '42px';

    // Reward: +1 Jelly to sender
    setCurrentUser(prev => prev ? { ...prev, jelly: prev.jelly + 1 } : null);

    // If target friend is offline -> Push Notification Simulation Banner!
    if (!targetFriend?.isOnline) {
      setPushToast(`📲 [백그라운드 웹푸시 발송] ${targetFriend?.name}님이 현재 오프라인 상태여서 휴대폰 잠금화면으로 알림을 전송했습니다!`);
      setTimeout(() => setPushToast(null), 3800);
    }
  };

  // Explode Bomb Message
  const handleExplodeBomb = (msgId: string) => {
    setAllMessages(prev => prev.map(m => m.id === msgId ? { ...m, isExploded: true } : m));
  };

  // Compute Current User's Friends
  const myFriends: User[] = currentUser
    ? allUsers.filter(u => friendships.some(([u1, u2]) => u1 === currentUser.id && u2 === u.id))
    : [];

  const activeFriend = allUsers.find(u => u.id === activeChatFriendId);
  const currentChatMsgs = (currentUser && activeChatFriendId)
    ? allMessages.filter(m =>
        (m.senderId === currentUser.id && m.receiverId === activeChatFriendId) ||
        (m.senderId === activeChatFriendId && m.receiverId === currentUser.id)
      )
    : [];

  return (
    <div className="flex justify-center bg-[#18181B] min-h-screen text-[#2B2321] font-sans antialiased">
      {/* Mobile Shell (430px) */}
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
        {/* 1. AUTH GATE (If not logged in) */}
        {/* ============================================================== */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col p-6 justify-between min-h-screen bg-gradient-to-b from-[#FFF5F5] to-[#FFFBF7] pop-in">
            {regStep === 'form' ? (
              <>
                <div className="text-center mt-8">
                  <div className="text-[48px] animate-bounce mb-1">🍡</div>
                  <h1 className="text-[26px] font-black text-[#FF6B6B] tracking-tight">
                    모키포키 (MokiPoki)
                  </h1>
                  <p className="text-[13px] text-[#786963] mt-1 font-medium">
                    내 분신 캐릭터와 함께 떠나는 인터랙티브 메신저
                  </p>
                </div>

                {/* Auth Mode Tabs */}
                <div className="bg-[#F5ECE5] p-1 rounded-2xl flex my-6">
                  <button
                    onClick={() => setAuthTab('login')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[14px] transition-all ${
                      authTab === 'login' ? 'bg-white text-[#FF6B6B] shadow-sm' : 'text-[#786963]'
                    }`}
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => setAuthTab('register')}
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
                        placeholder="@hyunjun 또는 @minji"
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#5C4D47] ml-1">비밀번호</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="demo (테스트용)"
                        className="w-full bg-white px-4 py-3 rounded-2xl border border-[#FED7AA] text-[14px] outline-none mt-1"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-2xl bg-[#FF6B6B] text-white font-extrabold text-[15px] shadow-md mt-2 active:scale-98"
                    >
                      모키포키 로그인 ✨
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
                        placeholder="@아이디 입력 (예: @charlie)"
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

                {/* Quick Account Switcher Section */}
                <div className="mt-8 pt-4 border-t border-[#F0E6DE]">
                  <div className="text-[12px] font-bold text-[#786963] text-center mb-2.5">
                    🧪 빠른 테스트용 계정 바로 들어가기:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {allUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickLogin(u.id)}
                        className="p-2.5 rounded-2xl bg-white border border-[#FED7AA] flex flex-col items-center shadow-sm active:scale-95"
                      >
                        <AvatarRenderer config={u.avatar} size={36} animated={false} />
                        <span className="font-bold text-[12px] text-[#2B2321] mt-1">{u.name}</span>
                        <span className="text-[10px] text-[#FF6B6B]">{u.handle}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Onboarding Choice Scene */
              <div className="flex-1 flex flex-col items-center justify-between py-4 pop-in">
                <div className="text-center mt-6">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#FFE5D9] text-[#E76F51]">
                    STEP 2 · 캐릭터 온보딩
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
                    className="w-full py-4 rounded-2xl bg-[#FF6B6B] text-white font-black text-[16px] shadow-lg active:scale-98"
                  >
                    이 캐릭터로 입주 완료! ✨
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (

        /* ============================================================== */}
        /* 2. AUTHENTICATED APP SHELL */
        /* ============================================================== */}
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
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] active:scale-95"
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

                  {currentChatMsgs.map(msg => {
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
                  
                  {/* Quick Switch Bar Between Accounts */}
                  <div className="bg-[#FFF9F5] p-2.5 rounded-2xl border border-[#FED7AA] flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#E76F51]">⚡ 계정 전환 테스트:</span>
                    <div className="flex gap-1.5">
                      {allUsers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleQuickLogin(u.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            currentUser.id === u.id ? 'bg-[#FF6B6B] text-white' : 'bg-white text-[#4B5563]'
                          }`}
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  </div>

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
                      내 친구 ({myFriends.length})
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
                    {myFriends.length === 0 ? (
                      <div className="text-center py-8 text-[#A89F91] text-[13px]">
                        아직 추가된 친구가 없어요. 상단의 [+ 친구 추가]를 눌러보세요!
                      </div>
                    ) : (
                      myFriends.map(friend => (
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
                  {myFriends.map(friend => {
                    const conv = allMessages.filter(m =>
                      (m.senderId === currentUser.id && m.receiverId === friend.id) ||
                      (m.senderId === friend.id && m.receiverId === currentUser.id)
                    );
                    const lastMsg = conv[conv.length - 1];

                    return (
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
                            <span className="text-[11px] text-[#A89F91]">{lastMsg?.timestamp || ''}</span>
                          </div>
                          <div className="text-[13px] text-[#786963] truncate mt-1">
                            {lastMsg ? (lastMsg.type === 'bomb' ? '💣 폭탄 메시지' : lastMsg.text) : '대화를 시작해보세요!'}
                          </div>
                        </div>
                        {conv.length > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center">
                            {conv.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
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
                        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, avatar: { ...wardrobeAvatar } } : u));
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
                    placeholder="@아이디 입력 (예: @minji, @junho)"
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
