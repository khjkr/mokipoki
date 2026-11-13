import React, { useState, useEffect, useRef } from 'react';
import { AvatarRenderer, AvatarConfig, DEFAULT_AVATAR_MOKI, DEFAULT_AVATAR_POKI } from './AvatarRenderer';

// Interfaces
interface Friend {
  id: string;
  handle: string;
  name: string;
  statusMsg: string;
  isOnline: boolean;
  avatar: AvatarConfig;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'bomb' | 'jelly_gift';
  isExploded?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'store' | 'profile'>('friends');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // My User Profile
  const [myUser, setMyUser] = useState({
    id: 'user_me',
    name: '현준',
    handle: '@hyunjun',
    statusMsg: '모키포키에서 뒹굴거리는 중 🍡',
    jelly: 240,
    ruby: 15,
    avatar: { ...DEFAULT_AVATAR_MOKI }
  });

  // Wardrobe Preview State in Store
  const [wardrobeAvatar, setWardrobeAvatar] = useState<AvatarConfig>({ ...DEFAULT_AVATAR_MOKI });

  // Friends List
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: 'f1',
      handle: '@poki_master',
      name: '민지',
      statusMsg: '체리 비니 새로 샀음 🍒',
      isOnline: true,
      avatar: { ...DEFAULT_AVATAR_POKI }
    },
    {
      id: 'f2',
      handle: '@moki_love',
      name: '준호',
      statusMsg: '오목 한판 뜰 사람 구함 🕹️',
      isOnline: true,
      avatar: {
        base: 'moki',
        face: 'sparkle',
        top: 'yellow_knit',
        headwear: 'round_glasses',
        handheld: 'gameboy',
        bg: 'pastel_circle',
        effect: 'sparkles'
      }
    },
    {
      id: 'f3',
      handle: '@charlie_cat',
      name: '수현',
      statusMsg: '낮잠 자는 시간... zZ',
      isOnline: false,
      avatar: {
        base: 'poki',
        face: 'drowsy',
        top: 'mint_hoodie',
        headwear: 'cat_ears',
        handheld: 'none',
        bg: 'pastel_circle',
        effect: 'none'
      }
    }
  ]);

  // Chat Messages Database
  const [messagesByFriend, setMessagesByFriend] = useState<Record<string, ChatMessage[]>>({
    f1: [
      { id: 'm1', senderId: 'f1', text: '현준아 모키포키 들어왔어? 대박 귀여워 ㅋㅋㅋ', timestamp: '18:40' },
      { id: 'm2', senderId: 'user_me', text: '응응! 나 방금 찹쌀떡 모키로 캐릭터 만들었음!', timestamp: '18:41' },
      { id: 'm3', senderId: 'f1', text: '이거 탭하면 터지는 폭탄 메시지다! 💣', timestamp: '18:41', type: 'bomb' }
    ],
    f2: [
      { id: 'm4', senderId: 'f2', text: '현준아 이따 심심하면 한판 붙자!', timestamp: '17:20' }
    ],
    f3: [
      { id: 'm5', senderId: 'f3', text: '나 스토어에서 고양이 귀 모자 샀음 ㅎㅎ', timestamp: '어제' }
    ]
  });

  // UI States
  const [inputText, setInputText] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addHandleInput, setAddHandleInput] = useState('');
  const [showGimmickMenu, setShowGimmickMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByFriend, activeChatId]);

  const handleSendMessage = (type: 'text' | 'bomb' | 'jelly_gift' = 'text') => {
    if (!activeChatId) return;
    if (type === 'text' && !inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: 'user_me',
      text: type === 'text' ? inputText.trim() : type === 'bomb' ? '💣 시크릿 폭탄 메시지!' : '🍇 젤리 10개를 선물했습니다!',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type
    };

    setMessagesByFriend(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    setMyUser(prev => ({ ...prev, jelly: prev.jelly + 1 }));
    setInputText('');
    setShowGimmickMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = '42px';
  };

  const handleExplodeBomb = (msgId: string) => {
    if (!activeChatId) return;
    setMessagesByFriend(prev => ({
      ...prev,
      [activeChatId]: prev[activeChatId].map(m => m.id === msgId ? { ...m, isExploded: true } : m)
    }));
  };

  const handleAddFriendSubmit = () => {
    const trimmed = addHandleInput.trim();
    if (!trimmed) return;
    const handle = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
    const newFriend: Friend = {
      id: 'f_' + Date.now(),
      handle,
      name: handle.replace('@', ''),
      statusMsg: '새로 만난 모키포키 친구 🎈',
      isOnline: true,
      avatar: { ...DEFAULT_AVATAR_POKI }
    };
    setFriends(prev => [newFriend, ...prev]);
    setAddHandleInput('');
    setShowAddFriend(false);
  };

  const activeFriend = friends.find(f => f.id === activeChatId);
  const currentChatMsgs = activeChatId ? (messagesByFriend[activeChatId] || []) : [];

  return (
    <div className="flex justify-center bg-[#18181B] min-h-screen text-[#2B2321] font-sans antialiased">
      <div className="w-full max-w-[430px] min-h-screen bg-[#FFFBF7] flex flex-col shadow-2xl relative overflow-hidden">
        
        <style>{`
          @keyframes avatarFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          .avatar-float { animation: avatarFloat 2.6s ease-in-out infinite; }
          @keyframes popIn {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .pop-in { animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        `}</style>

        {/* 1. TOP HEADER */}
        <header
          className="sticky top-0 z-30 bg-[#FFFBF7]/90 backdrop-blur-md px-5 pb-3 border-b border-[#F0E6DE] flex items-center justify-between"
          style={{ paddingTop: 'max(48px, env(safe-area-inset-top, 48px))' }}
        >
          {activeChatId ? (
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setActiveChatId(null)}
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
                    {activeFriend?.isOnline && <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />}
                  </div>
                  <div className="text-[12px] text-[#8C7A74]">{activeFriend?.handle}</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-black tracking-tight text-[#FF6B6B] flex items-center gap-1">
                  🍡 모키포키
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFE5D9] text-[#E76F51]">
                  PWA
                </span>
              </div>
              <div className="flex items-center gap-2 bg-[#FFF0E6] px-3 py-1 rounded-full border border-[#FED7AA]">
                <span className="text-[13px] font-extrabold text-[#D97706]">🍇 {myUser.jelly}</span>
                <span className="text-[11px] text-[#A8A29E]">|</span>
                <span className="text-[13px] font-extrabold text-[#EF4444]">💎 {myUser.ruby}</span>
              </div>
            </>
          )}
        </header>

        {/* 2. MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">

          {activeChatId ? (
            <div className="flex flex-col gap-3 min-h-full">
              <div className="text-center my-2">
                <span className="text-[11px] bg-[#EFE7E1] text-[#786963] px-3 py-1 rounded-full font-medium">
                  {activeFriend?.name}님과의 대화가 시작되었습니다
                </span>
              </div>

              {currentChatMsgs.map(msg => {
                const isMe = msg.senderId === 'user_me';
                const avatar = isMe ? myUser.avatar : activeFriend?.avatar || DEFAULT_AVATAR_POKI;

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

          {/* TAB 1: FRIENDS */}
          {!activeChatId && activeTab === 'friends' && (
            <div className="flex flex-col gap-5 pop-in">
              <div className="bg-gradient-to-r from-[#FFF0E6] to-[#FFE5D9] p-4 rounded-3xl border border-[#FED7AA] flex items-center gap-4 shadow-sm">
                <AvatarRenderer config={myUser.avatar} size={70} />
                <div className="flex-1">
                  <div className="font-extrabold text-[17px] text-[#2B2321]">{myUser.name}</div>
                  <div className="text-[12px] text-[#FF6B6B] font-semibold">{myUser.handle}</div>
                  <div className="text-[12px] text-[#786963] mt-0.5">{myUser.statusMsg}</div>
                </div>
                <button
                  onClick={() => {
                    setWardrobeAvatar({ ...myUser.avatar });
                    setActiveTab('store');
                  }}
                  className="px-3 py-1.5 rounded-full bg-white text-[12px] font-bold text-[#E76F51] border border-[#FED7AA] shadow-sm active:scale-95"
                >
                  꾸미기 ✨
                </button>
              </div>

              <div className="flex items-center justify-between mt-1 px-1">
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

              <div className="flex flex-col gap-2.5">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    onClick={() => setActiveChatId(friend.id)}
                    className="bg-white p-3.5 rounded-2xl border border-[#F0E6DE] flex items-center gap-3.5 shadow-sm active:bg-[#FFF9F5] transition-colors cursor-pointer"
                  >
                    <div className="relative">
                      <AvatarRenderer config={friend.avatar} size={50} animated={false} />
                      {friend.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[15px] text-[#2B2321]">{friend.name}</span>
                        <span className="text-[11px] text-[#A89F91]">{friend.handle}</span>
                      </div>
                      <div className="text-[12px] text-[#786963] truncate mt-0.5">{friend.statusMsg}</div>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-[#FFF0E6] text-[#E76F51] flex items-center justify-center font-bold text-[13px]">
                      💬
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CHAT LIST */}
          {!activeChatId && activeTab === 'chat' && (
            <div className="flex flex-col gap-3 pop-in">
              <div className="font-extrabold text-[18px] text-[#2B2321] mb-1">채팅 목록</div>
              {friends.map(friend => {
                const msgs = messagesByFriend[friend.id] || [];
                const lastMsg = msgs[msgs.length - 1];

                return (
                  <div
                    key={friend.id}
                    onClick={() => setActiveChatId(friend.id)}
                    className="bg-white p-4 rounded-2xl border border-[#F0E6DE] flex items-center gap-3.5 shadow-sm active:bg-[#FFF9F5] transition-colors cursor-pointer"
                  >
                    <AvatarRenderer config={friend.avatar} size={52} animated={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[16px] text-[#2B2321]">{friend.name}</span>
                        <span className="text-[11px] text-[#A89F91]">{lastMsg?.timestamp || ''}</span>
                      </div>
                      <div className="text-[13px] text-[#786963] truncate mt-1">
                        {lastMsg ? (lastMsg.type === 'bomb' ? '💣 폭탄 메시지' : lastMsg.text) : '대화를 시작해보세요!'}
                      </div>
                    </div>
                    {msgs.length > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center">
                        {msgs.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: STORE & WARDROBE */}
          {!activeChatId && activeTab === 'store' && (
            <div className="flex flex-col gap-4 pop-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[18px]">🛍️ 모키포키 드레스룸</span>
                <button
                  onClick={() => {
                    setMyUser(prev => ({ ...prev, avatar: { ...wardrobeAvatar } }));
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

                <div className="font-bold text-[14px] text-[#5C4D47] mt-1">🎈 손에 든 소품</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'heart_balloon', label: '🎈 하트 풍선' },
                    { id: 'gameboy', label: '🎮 미니 게임기' },
                    { id: 'none', label: '❌ 소품 없음' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setWardrobeAvatar(prev => ({ ...prev, handheld: item.id as any }))}
                      className={`p-2.5 rounded-2xl border text-[13px] font-bold transition-all ${
                        wardrobeAvatar.handheld === item.id
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

          {/* TAB 4: PROFILE */}
          {!activeChatId && activeTab === 'profile' && (
            <div className="flex flex-col gap-4 pop-in">
              <div className="bg-white p-6 rounded-3xl border border-[#F0E6DE] flex flex-col items-center shadow-sm">
                <AvatarRenderer config={myUser.avatar} size={150} animated={true} />
                <div className="font-black text-[20px] text-[#2B2321] mt-2">{myUser.name}</div>
                <div className="text-[13px] font-bold text-[#FF6B6B]">{myUser.handle}</div>
                <div className="text-[13px] text-[#786963] mt-1 text-center bg-[#FDF6F0] px-4 py-2 rounded-2xl w-full">
                  "{myUser.statusMsg}"
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  <div className="bg-[#FFF8E7] p-3 rounded-2xl border border-[#FDE68A] text-center">
                    <div className="text-[11px] font-bold text-[#D97706]">내 보유 젤리</div>
                    <div className="text-[18px] font-black text-[#B45309]">🍇 {myUser.jelly}</div>
                  </div>
                  <div className="bg-[#FEE2E2] p-3 rounded-2xl border border-[#FECACA] text-center">
                    <div className="text-[11px] font-bold text-[#DC2626]">내 보유 루비</div>
                    <div className="text-[18px] font-black text-[#B91C1C]">💎 {myUser.ruby}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-[#F0E6DE] shadow-sm">
                <div className="font-extrabold text-[15px] text-[#2B2321] mb-2">📖 친구들의 방명록 (3)</div>
                <div className="space-y-2 text-[13px]">
                  <div className="bg-[#FFF9F5] p-2.5 rounded-xl border border-[#F5E6DC]">
                    <span className="font-bold text-[#E76F51]">민지: </span>
                    <span>현준아 모키 캐릭터 옷장 너무 귀엽다 ㅋㅋㅋ</span>
                  </div>
                  <div className="bg-[#FFF9F5] p-2.5 rounded-xl border border-[#F5E6DC]">
                    <span className="font-bold text-[#E76F51]">준호: </span>
                    <span>출석체크 완료! 젤리 파밍 중</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* 3. CHAT INPUT BAR */}
        {activeChatId && (
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
                placeholder="메시지를 입력하세요 (전송 시 젤리 +1)..."
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

        {/* 4. BOTTOM 4-TAB NAVIGATION BAR */}
        {!activeChatId && (
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

        {/* 5. ADD FRIEND MODAL */}
        {showAddFriend && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xs p-5 rounded-3xl shadow-2xl border border-[#FED7AA] pop-in">
              <div className="font-extrabold text-[17px] text-[#2B2321] mb-1">새 친구 추가</div>
              <div className="text-[12px] text-[#786963] mb-3">인스타그램처럼 @고유아이디를 입력하세요</div>
              <input
                type="text"
                value={addHandleInput}
                onChange={e => setAddHandleInput(e.target.value)}
                placeholder="@아이디 입력"
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
                  onClick={handleAddFriendSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6B6B] text-white font-bold text-[13px] shadow-sm"
                >
                  추가하기
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
