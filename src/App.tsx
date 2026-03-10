import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book as BookIcon, 
  Camera, 
  Plus, 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  ChevronLeft, 
  Globe,
  Image as ImageIcon,
  PenTool
} from 'lucide-react';
import { User, Book, Entry, CommunityPost, Comment, Activity, Language, Annotation, ActivityComment } from './types';
import { translations } from './constants';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('zh');
  const [view, setView] = useState<'onboarding' | 'home' | 'book' | 'community' | 'activities' | 'profile'>('onboarding');
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const savedUser = localStorage.getItem('watercloud_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Verify user exists in DB to prevent foreign key errors from stale localStorage
      fetch(`/api/users/${parsedUser.id}`)
        .then(async res => {
          if (!res.ok) {
            throw new Error(`User verification failed: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data && data.id) {
            setUser(data);
            setView('home');
          } else {
            console.warn('User not found in DB, clearing localStorage');
            localStorage.removeItem('watercloud_user');
            setView('onboarding');
          }
        })
        .catch(err => {
          console.error('Error verifying user:', err);
          localStorage.removeItem('watercloud_user');
          setView('onboarding');
        });
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBooks();
      fetchActivities();
    }
  }, [user]);

  useEffect(() => {
    if (view === 'community') {
      fetchCommunity();
    }
  }, [view]);

  const fetchBooks = async () => {
    if (!user) return;
    const res = await fetch(`/api/books?userId=${user.id}`);
    let data = await res.json();
    
    // Ensure "Essays" notebook exists
    const essayTitle = lang === 'zh' ? '随笔' : 'Essays';
    const hasEssays = data.some((b: Book) => b.title === essayTitle);
    
    if (!hasEssays) {
      const createRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          title: essayTitle, 
          cover: 'https://picsum.photos/seed/essays/800/1200', 
          description: lang === 'zh' ? '记录生活中的点滴感悟。' : 'Record bits of inspiration in life.' 
        })
      });
      if (createRes.ok) {
        const refreshRes = await fetch(`/api/books?userId=${user.id}`);
        data = await refreshRes.json();
      }
    }
    
    setBooks(data);
  };

  const fetchEntries = async (bookId: number) => {
    const res = await fetch(`/api/books/${bookId}/entries`);
    const data = await res.json();
    setEntries(data);
  };

  const fetchCommunity = async () => {
    const res = await fetch('/api/community');
    const data = await res.json();
    setCommunityPosts(data);
  };

  const fetchActivities = async () => {
    const res = await fetch('/api/activities');
    const data = await res.json();
    setActivities(data);
  };

  const handleOnboarding = async (nickname: string, avatar: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar })
      });
      if (!res.ok) throw new Error('Failed to create user');
      const data = await res.json();
      const newUser = { id: data.id, nickname, avatar };
      setUser(newUser);
      localStorage.setItem('watercloud_user', JSON.stringify(newUser));
      setView('home');
    } catch (error) {
      console.error('Onboarding error:', error);
      alert(lang === 'zh' ? '创建用户失败，请稍后再试' : 'Failed to create user, please try again');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleAddBook = async (title: string, cover: string, description: string) => {
    if (!user) {
      alert(t.nicknameRequired);
      return;
    }
    console.log('Adding book for user:', user.id);
    setIsSaving(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title, cover, description })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add book');
      }
      await fetchBooks();
      setShowAddBook(false);
    } catch (error) {
      console.error('Add book error:', error);
      alert(lang === 'zh' ? `添加书籍失败: ${error instanceof Error ? error.message : '未知错误'}` : `Failed to add book: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddActivity = async (title: string, announcement: string, location: string, time: string, posters: string[]) => {
    if (!user) {
      alert(t.nicknameRequired);
      return;
    }
    console.log('Adding activity for user:', user.id);
    setIsSaving(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title, announcement, location, time, posters })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add activity');
      }
      await fetchActivities();
      setShowAddActivity(false);
    } catch (error) {
      console.error('Add activity error:', error);
      alert(lang === 'zh' ? `发布活动失败: ${error instanceof Error ? error.message : '未知错误'}` : `Failed to add activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEntry = async (title: string, content: string, image: string, feelings: string) => {
    if (!selectedBook) return;
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: selectedBook.id, title, content, image, feelings })
    });
    fetchEntries(selectedBook.id);
    setShowAddEntry(false);
  };

  const handleForwardToCommunity = async (entryId: number, content: string = '') => {
    if (!user || !selectedBook) return;
    await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        bookId: selectedBook.id,
        entryId: entryId,
        type: 'entry',
        content: content
      })
    });
    alert(lang === 'zh' ? '已转发至社区' : 'Forwarded to community');
    if (view === 'community') fetchCommunity();
  };

  const handleLike = async (postId: number) => {
    await fetch(`/api/community/${postId}/like`, { method: 'POST' });
    fetchCommunity();
  };

  const handleParticipate = async (activityId: number, nickname: string) => {
    if (!user) return;
    await fetch(`/api/activities/${activityId}/participate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, nickname })
    });
    alert(t.participateSuccess);
    fetchActivities();
  };

  const toggleLang = () => setLang(l => l === 'zh' ? 'en' : 'zh');

  return (
    <div className="min-h-screen paper-texture flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-black/10">
        <h1 className="text-3xl font-serif font-bold tracking-widest text-accent">{t.appName}</h1>
        <div className="flex gap-4 items-center">
          <button onClick={toggleLang} className="text-sm font-medium flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
            <Globe size={16} />
            {t.switchLang}
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm italic">{user.nickname}</span>
              <img src={user.avatar} className="w-8 h-8 rounded-full border border-accent/20 object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {view === 'onboarding' && (
            <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Onboarding t={t} onComplete={handleOnboarding} />
            </motion.div>
          )}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Home 
                t={t} 
                books={books} 
                onAddBook={() => setShowAddBook(true)}
                onSelectBook={(book) => {
                  setSelectedBook(book);
                  fetchEntries(book.id);
                  setView('book');
                }}
              />
            </motion.div>
          )}
          {view === 'book' && selectedBook && (
            <motion.div key="book" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BookDetail 
                t={t} 
                book={selectedBook} 
                entries={entries}
                onBack={() => setView('home')}
                onAddEntry={() => setShowAddEntry(true)}
                onForward={handleForwardToCommunity}
                lang={lang}
              />
            </motion.div>
          )}
          {view === 'community' && (
            <motion.div key="community" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {selectedPost ? (
                <PostDetail 
                  t={t} 
                  post={selectedPost} 
                  user={user}
                  onBack={() => setSelectedPost(null)} 
                  onSelectUser={(u) => {
                    setViewingUser(u);
                    setView('profile');
                  }}
                />
              ) : (
                <Community 
                  t={t} 
                  posts={communityPosts} 
                  onSelectPost={setSelectedPost}
                  onLike={handleLike}
                  onSelectUser={(u) => {
                    setViewingUser(u);
                    setView('profile');
                  }}
                />
              )}
            </motion.div>
          )}
          {view === 'activities' && (
            <motion.div key="activities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Activities 
                t={t} 
                activities={activities} 
                user={user}
                onParticipate={handleParticipate}
                onAddActivity={() => setShowAddActivity(true)}
                lang={lang}
              />
            </motion.div>
          )}
          {view === 'profile' && viewingUser && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UserProfile 
                t={t} 
                user={viewingUser} 
                onBack={() => setView('community')} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      {user && view !== 'onboarding' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-black/5 p-4 flex justify-around items-center">
          <NavButton active={view === 'home'} icon={<BookIcon />} label={t.myBooks} onClick={() => setView('home')} />
          <NavButton active={view === 'community'} icon={<Users />} label={t.community} onClick={() => setView('community')} />
          <NavButton active={view === 'activities'} icon={<PenTool />} label={t.activities} onClick={() => setView('activities')} />
        </nav>
      )}

      {/* Modals */}
      {showAddBook && (
        <Modal title={t.addBook} onClose={() => setShowAddBook(false)}>
          <AddBookForm t={t} onSubmit={handleAddBook} onCancel={() => setShowAddBook(false)} isSaving={isSaving} lang={lang} />
        </Modal>
      )}
      {showAddEntry && (
        <Modal title={t.writeEntry} onClose={() => setShowAddEntry(false)}>
          <AddEntryForm t={t} onSubmit={handleAddEntry} onCancel={() => setShowAddEntry(false)} />
        </Modal>
      )}
      {showAddActivity && (
        <Modal title={t.addActivity} onClose={() => setShowAddActivity(false)}>
          <AddActivityForm t={t} onSubmit={handleAddActivity} onCancel={() => setShowAddActivity(false)} isSaving={isSaving} lang={lang} />
        </Modal>
      )}
    </div>
  );
}

function UserProfile({ t, user, onBack }: { t: any, user: User, onBack: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [booksRes, postsRes] = await Promise.all([
        fetch(`/api/books?userId=${user.id}`),
        fetch(`/api/users/${user.id}/posts`)
      ]);
      const [booksData, postsData] = await Promise.all([
        booksRes.json(),
        postsRes.json()
      ]);
      setBooks(booksData);
      setPosts(postsData);
      setLoading(false);
    };
    fetchData();
  }, [user.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto p-6"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-ink/50 hover:text-ink mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span className="text-sm uppercase tracking-widest">Back</span>
      </button>

      <div className="flex flex-col items-center mb-16">
        <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-accent/20 p-1 mb-4 object-cover shadow-xl" referrerPolicy="no-referrer" />
        <h2 className="text-3xl font-serif mb-2">{user.nickname}</h2>
        <div className="h-1 w-12 bg-accent"></div>
      </div>

      {loading ? (
        <div className="text-center py-20 opacity-40 italic">Loading...</div>
      ) : (
        <div className="space-y-16">
          {/* Books */}
          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] opacity-40 border-b border-black/5 pb-2 mb-8">{t.readingBooks}</h3>
            {books.length === 0 ? (
              <p className="italic opacity-30 text-center py-8">暂无书籍 (No books)</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-6">
                {books.map(book => (
                  <div key={book.id} className="group">
                    <div className="aspect-[3/4] relative overflow-hidden rounded-sm shadow-md mb-2 border border-black/5">
                      <img src={book.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <h4 className="font-serif text-xs text-center truncate">{book.title}</h4>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Posts */}
          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] opacity-40 border-b border-black/5 pb-2 mb-8">{t.userAbstracts}</h3>
            {posts.length === 0 ? (
              <p className="italic opacity-30 text-center py-8">暂无公开文摘 (No public abstracts)</p>
            ) : (
              <div className="space-y-8">
                {posts.map(post => (
                  <div key={post.id} className="retro-card p-6 rounded-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-serif mb-1">{post.entry_title || "无题"}</h4>
                        <span className="text-[10px] uppercase tracking-widest opacity-40">
                          {new Date(post.created_at).toLocaleDateString()} · 来自《{post.book_title}》
                        </span>
                      </div>
                    </div>
                    
                    {post.entry_content && (
                      <div className="mb-4">
                        <p className="leading-relaxed text-sm italic opacity-80 border-l-2 border-accent/30 pl-4 mb-3 line-clamp-4">{post.entry_content}</p>
                      </div>
                    )}
                    
                    <p className="leading-relaxed text-sm mb-4">{post.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-accent scale-110' : 'text-ink/40 hover:text-ink/70'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      <span className="text-[10px] font-medium uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Onboarding({ t, onComplete }: { t: any, onComplete: (n: string, a: string) => any }) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('https://picsum.photos/seed/inktrace/200');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto mt-20 p-8 text-center"
    >
      <h2 className="text-4xl font-serif mb-2">{t.onboardingTitle}</h2>
      <p className="text-ink/60 mb-12 italic">{t.onboardingSubtitle}</p>
      
      <div className="mb-8 flex flex-col items-center">
        <img src={avatar} className="w-24 h-24 rounded-full border-2 border-accent p-1 mb-4 object-cover" referrerPolicy="no-referrer" />
        <button 
          onClick={() => setAvatar(`https://picsum.photos/seed/${Math.random()}/200`)}
          className="text-xs text-accent underline underline-offset-4"
        >
          更换头像 (Change Avatar)
        </button>
      </div>

      <div className="space-y-6">
        <div className="text-left">
          <label className="text-xs uppercase tracking-widest opacity-50 block mb-2">{t.nickname}</label>
          <input 
            type="text" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-transparent border-b border-ink/20 py-2 focus:border-accent outline-none transition-colors text-xl font-serif"
            placeholder="如：苏东坡"
          />
        </div>
        <button 
          onClick={() => nickname && onComplete(nickname, avatar)}
          disabled={!nickname}
          className="w-full py-4 bg-accent text-white rounded-sm font-serif text-xl tracking-widest disabled:opacity-50 hover:bg-accent/90 transition-colors"
        >
          {t.enter}
        </button>
      </div>
    </motion.div>
  );
}

function Home({ t, books, onAddBook, onSelectBook }: { t: any, books: Book[], onAddBook: () => void, onSelectBook: (b: Book) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-6"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-serif">{t.myBooks}</h2>
          <div className="h-1 w-12 bg-accent mt-2"></div>
        </div>
        <button 
          onClick={onAddBook}
          className="flex items-center gap-2 text-accent border border-accent/30 px-4 py-2 rounded-full hover:bg-accent hover:text-white transition-all"
        >
          <Plus size={18} />
          <span className="text-sm font-medium">{t.addBook}</span>
        </button>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-20 opacity-40 italic">
          <BookIcon size={48} className="mx-auto mb-4" />
          <p>{t.noBooks}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {books.map(book => (
            <motion.div 
              key={book.id}
              whileHover={{ y: -5 }}
              onClick={() => onSelectBook(book)}
              className="cursor-pointer group"
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-sm shadow-lg mb-3 border border-black/5">
                <img src={book.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs uppercase tracking-widest border border-white/50 px-3 py-1">Open</span>
                </div>
              </div>
              <h3 className="font-serif text-lg text-center truncate">{book.title}</h3>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BookDetail({ t, book, entries, onBack, onAddEntry, onForward, lang }: { t: any, book: Book, entries: Entry[], onBack: () => void, onAddEntry: () => void, onForward: (entryId: number) => void, lang: Language }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto p-6"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-ink/50 hover:text-ink mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span className="text-sm uppercase tracking-widest">Back</span>
      </button>

      <div className="flex gap-8 mb-16 items-start">
        <div className="w-32 aspect-[3/4] flex-shrink-0 shadow-xl rounded-sm overflow-hidden border border-black/5">
          <img src={book.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1">
          <h2 className="text-4xl font-serif mb-4">{book.title}</h2>
          <p className="text-ink/60 italic leading-relaxed">{book.description}</p>
          <button 
            onClick={onAddEntry}
            className="mt-6 flex items-center gap-2 bg-ink text-white px-6 py-2 rounded-sm hover:bg-ink/80 transition-colors"
          >
            <Plus size={18} />
            <span className="font-serif tracking-widest">{t.writeEntry}</span>
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {entries.map(entry => (
          <div key={entry.id} className="relative pl-8 border-l border-accent/20">
            <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-accent"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-2xl font-serif mb-1">{entry.title}</h4>
                <span className="text-[10px] uppercase tracking-widest opacity-40">{new Date(entry.created_at).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={() => onForward(entry.id)}
                className="flex items-center gap-1 text-accent hover:text-accent/70 transition-colors text-xs uppercase tracking-widest"
              >
                <Share2 size={14} />
                <span>{lang === 'zh' ? '转发' : 'Forward'}</span>
              </button>
            </div>
            
            {entry.image && (
              <div className="mb-6 rounded-sm overflow-hidden shadow-md">
                <img src={entry.image} className="w-full max-h-96 object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            
            <div className="prose prose-stone max-w-none mb-6">
              <p className="leading-relaxed whitespace-pre-wrap">{entry.content}</p>
            </div>
            
            {entry.feelings && (
              <div className="bg-accent/5 p-4 border-l-2 border-accent italic text-ink/70">
                <span className="text-[10px] uppercase tracking-widest block mb-1 opacity-50">{t.entryFeelings}</span>
                {entry.feelings}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Community({ t, posts, onSelectPost, onLike, onSelectUser }: { t: any, posts: CommunityPost[], onSelectPost: (p: CommunityPost) => any, onLike: (id: number) => any, onSelectUser: (u: User) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-6"
    >
      <div className="flex justify-center mb-12 border-b border-black/5">
        <h2 className="pb-4 text-2xl font-serif tracking-widest text-accent">
          {t.community}
        </h2>
      </div>

      <div className="space-y-8">
        {posts.map(post => (
          <div key={post.id} className="retro-card p-6 rounded-sm cursor-pointer hover:shadow-xl transition-all" onClick={() => onSelectPost(post)}>
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={post.avatar} 
                className="w-10 h-10 rounded-full border border-black/5 hover:ring-2 hover:ring-accent transition-all" 
                referrerPolicy="no-referrer" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUser({ id: post.user_id, nickname: post.nickname, avatar: post.avatar });
                }}
              />
              <div onClick={(e) => {
                  e.stopPropagation();
                  onSelectUser({ id: post.user_id, nickname: post.nickname, avatar: post.avatar });
                }} className="hover:text-accent transition-colors">
                <h5 className="font-serif text-sm">{post.nickname}</h5>
                <span className="text-[10px] opacity-40 uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {post.entry_content ? (
              <div className="mb-6">
                <p className="leading-relaxed line-clamp-3 italic opacity-80 border-l-2 border-accent/30 pl-4 mb-3">{post.entry_content}</p>
                <p className="text-sm opacity-60">{post.content}</p>
              </div>
            ) : (
              <p className="mb-6 leading-relaxed line-clamp-3">{post.content}</p>
            )}

            {post.book_title && (
              <div className="flex gap-4 p-3 bg-paper rounded-sm border border-black/5 mb-6">
                <img src={post.book_cover} className="w-12 h-16 object-cover shadow-sm" referrerPolicy="no-referrer" />
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-widest opacity-40 mb-1">来自书志 (From Journal)</span>
                  <h6 className="font-serif text-sm">《{post.book_title}》</h6>
                </div>
              </div>
            )}

            <div className="flex gap-6 border-t border-black/5 pt-4">
              <button onClick={(e) => { e.stopPropagation(); onLike(post.id); }} className="flex items-center gap-1 text-ink/40 hover:text-accent transition-colors">
                <Heart size={16} className={post.likes > 0 ? 'fill-accent text-accent' : ''} />
                <span className="text-xs">{post.likes}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onSelectPost(post); }} className="flex items-center gap-1 text-ink/40 hover:text-ink transition-colors">
                <MessageSquare size={16} />
                <span className="text-xs">{t.comment}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PostDetail({ t, post, user, onBack, onSelectUser }: { t: any, post: CommunityPost, user: User | null, onBack: () => void, onSelectUser: (u: User) => void }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [showAddAnnotation, setShowAddAnnotation] = useState(false);

  useEffect(() => {
    fetchAnnotations();
    fetchComments();
  }, [post.id]);

  const fetchAnnotations = async () => {
    const res = await fetch(`/api/community/${post.id}/annotations`);
    const data = await res.json();
    setAnnotations(data);
  };

  const fetchComments = async () => {
    const res = await fetch(`/api/community/${post.id}/comments`);
    const data = await res.json();
    setComments(data);
  };

  const handleAddComment = async () => {
    if (!user || !newComment) return;
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        userId: user.id,
        content: newComment
      })
    });
    setNewComment('');
    fetchComments();
  };

  const handleAddAnnotation = async () => {
    if (!user || selectedSentence === null || !newAnnotation) return;
    await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        userId: user.id,
        sentenceIndex: selectedSentence,
        content: newAnnotation
      })
    });
    setNewAnnotation('');
    setShowAddAnnotation(false);
    fetchAnnotations();
  };

  // Split content into sentences (basic heuristic)
  const mainText = post.entry_content || post.content;
  const sentences = mainText.split(/([。！？.!?\n])/).reduce((acc: string[], curr, i) => {
    if (i % 2 === 0) acc.push(curr);
    else acc[acc.length - 1] += curr;
    return acc;
  }, []).filter(s => s.trim());

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-ink/50 hover:text-ink mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span className="text-sm uppercase tracking-widest">Back</span>
      </button>

      <div className="retro-card p-8 rounded-sm mb-8">
        <div className="flex items-center gap-4 mb-8">
          <img 
            src={post.avatar} 
            className="w-12 h-12 rounded-full border border-black/5 cursor-pointer hover:ring-2 hover:ring-accent transition-all" 
            referrerPolicy="no-referrer" 
            onClick={() => onSelectUser({ id: post.user_id, nickname: post.nickname, avatar: post.avatar })}
          />
          <div className="cursor-pointer hover:text-accent transition-colors" onClick={() => onSelectUser({ id: post.user_id, nickname: post.nickname, avatar: post.avatar })}>
            <h5 className="font-serif text-lg">{post.nickname}</h5>
            <span className="text-xs opacity-40 uppercase tracking-widest">{new Date(post.created_at).toLocaleString()}</span>
          </div>
        </div>

        {post.entry_title && (
          <h4 className="text-2xl font-serif text-center mb-6 border-b border-black/5 pb-4">{post.entry_title}</h4>
        )}

        <div className="text-xl leading-loose font-serif mb-12">
          {sentences.map((sentence, idx) => (
            <span 
              key={idx}
              onClick={() => {
                setSelectedSentence(idx);
                setShowAddAnnotation(true);
              }}
              className={`cursor-pointer transition-all hover:bg-accent/10 p-1 rounded-sm relative group ${selectedSentence === idx ? 'bg-accent/20' : ''}`}
            >
              {sentence}
              {annotations.some(a => a.sentence_index === idx) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_rgba(242,125,38,0.6)]" />
              )}
            </span>
          ))}
        </div>

        {post.entry_content && post.content && (
          <div className="mb-12 p-6 bg-accent/5 border-l-4 border-accent italic text-ink/70">
            <span className="text-[10px] uppercase tracking-widest opacity-40 block mb-2">心得 (Thoughts)</span>
            {post.content}
          </div>
        )}

        {post.book_title && (
          <div className="flex gap-6 p-4 bg-paper rounded-sm border border-black/5 mb-8">
            <img src={post.book_cover} className="w-16 h-24 object-cover shadow-md" referrerPolicy="no-referrer" />
            <div className="flex flex-col justify-center">
              <span className="text-xs uppercase tracking-widest opacity-40 mb-1">来自书志 (From Journal)</span>
              <h6 className="font-serif text-xl">《{post.book_title}》</h6>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-12 mt-16">
        <section className="space-y-6">
          <h3 className="text-xl font-serif border-b border-black/5 pb-2">{t.sentenceAnnotations}</h3>
          {annotations.length === 0 ? (
            <p className="italic opacity-40 text-center py-8">点击文字进行批注 (Click text to annotate)</p>
          ) : (
            <div className="space-y-4">
              {annotations.map(ann => (
                <div key={ann.id} className="bg-white/50 p-4 rounded-sm border-l-4 border-accent shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={ann.avatar} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    <span className="text-xs font-serif">{ann.nickname}</span>
                    <span className="text-[10px] opacity-40">批注了第 {ann.sentence_index + 1} 句</span>
                  </div>
                  <p className="text-sm italic mb-2 opacity-60">"{sentences[ann.sentence_index]}"</p>
                  <p className="text-sm">{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-serif border-b border-black/5 pb-2">{t.comment}</h3>
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <img src={c.avatar} className="w-8 h-8 rounded-full border border-black/5" referrerPolicy="no-referrer" />
                <div className="flex-1 bg-white/50 p-4 rounded-sm text-sm shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span className="font-serif text-xs">{c.nickname}</span>
                    <span className="text-[10px] opacity-40">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          {user && (
            <div className="mt-8 bg-paper p-6 rounded-sm border border-black/5 shadow-inner">
              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="发表您的见解..."
                className="w-full bg-transparent border-b border-black/10 py-2 mb-4 outline-none focus:border-accent text-sm resize-none"
                rows={2}
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleAddComment}
                  className="px-8 py-2 bg-accent text-white font-serif tracking-widest text-sm hover:bg-accent/90 transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {showAddAnnotation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper w-full max-w-md p-6 rounded-sm shadow-2xl"
            >
              <h4 className="font-serif text-xl mb-4">{t.addAnnotation}</h4>
              <p className="text-sm italic opacity-60 mb-4">"{sentences[selectedSentence!]?.slice(0, 50)}..."</p>
              <textarea 
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                className="w-full bg-transparent border border-black/10 p-3 mb-6 outline-none focus:border-accent text-sm"
                rows={4}
                placeholder="在此输入您的批注..."
              />
              <div className="flex gap-4">
                <button onClick={() => setShowAddAnnotation(false)} className="flex-1 py-2 border border-black/10 text-sm uppercase tracking-widest">{t.cancel}</button>
                <button onClick={handleAddAnnotation} className="flex-1 py-2 bg-accent text-white font-serif tracking-widest">{t.save}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ActivityCardProps {
  key?: any;
  activity: Activity;
  isPast?: boolean;
  t: any;
  user: User | null;
  onParticipate: (id: number, n: string) => any;
  isCommentsOpen: boolean;
  comments: ActivityComment[];
  onToggleComments: () => void;
  onAddComment: (id: number) => void;
  newComment: string;
  setNewComment: (s: string) => void;
  lang: Language;
}

function ActivityCard({ 
  activity, 
  isPast, 
  t, 
  user, 
  onParticipate, 
  isCommentsOpen, 
  comments, 
  onToggleComments, 
  onAddComment,
  newComment,
  setNewComment,
  lang
}: ActivityCardProps) {
  const [nickname, setNickname] = useState('');
  const posters: string[] = JSON.parse(activity.posters || '[]');

  return (
    <div className={`relative p-8 border-2 rounded-sm bg-accent/5 transition-all ${isPast ? 'border-black/10 grayscale-[0.5] opacity-80' : 'border-accent/20 shadow-lg'}`}>
      <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] uppercase tracking-widest text-white ${isPast ? 'bg-ink/40' : 'bg-accent'}`}>
        {isPast ? t.pastActivities : t.upcomingActivities}
      </div>
      
      <div className="flex items-center gap-3 mb-6 justify-center">
        {activity.author_avatar && (
          <img src={activity.author_avatar} className="w-8 h-8 rounded-full border border-accent/20" referrerPolicy="no-referrer" />
        )}
        <span className="text-xs italic opacity-60">{activity.author_nickname || '水云文学社'}</span>
      </div>

      <h3 className="text-2xl font-serif text-center mb-4">{activity.title}</h3>
      
      <div className="flex flex-col gap-3 mb-8 text-center text-sm">
        <div className="flex items-center justify-center gap-2 bg-black/5 py-2 px-4 rounded-full w-fit mx-auto">
          <span className="font-bold opacity-60">{t.activityTime}:</span>
          <span className="font-serif">{activity.time}</span>
        </div>
        <div className="flex items-center justify-center gap-2 bg-black/5 py-2 px-4 rounded-full w-fit mx-auto">
          <span className="font-bold opacity-60">{t.activityLocation}:</span>
          <span className="font-serif">{activity.location}</span>
        </div>
      </div>

      <div className="relative mb-10">
        <div className="absolute -left-2 top-0 text-4xl text-accent/20 font-serif">“</div>
        <p className="leading-relaxed text-ink/80 italic text-center px-6 text-lg font-serif">{activity.announcement}</p>
        <div className="absolute -right-2 bottom-0 text-4xl text-accent/20 font-serif">”</div>
      </div>
      
      {posters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {posters.map((poster, idx) => (
            <div key={idx} className="aspect-[9/16] overflow-hidden rounded-sm shadow-md">
              <img src={poster} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 max-w-xs mx-auto">
        {!isPast && (
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder={t.nickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white border border-black/10 p-2 text-center outline-none focus:border-accent transition-colors"
            />
            <button 
              onClick={() => nickname ? onParticipate(activity.id, nickname) : alert(t.nicknameRequired)}
              className="w-full py-3 bg-accent text-white font-serif tracking-widest hover:bg-accent/90 transition-colors"
            >
              {t.participate}
            </button>
          </div>
        )}

        {activity.participants && activity.participants.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
              {lang === 'zh' ? '和你一起参与的还有' : 'Also participating with you'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {activity.participants.map((p, i) => (
                <span key={i} className="text-xs bg-accent/10 px-2 py-1 rounded-sm italic">
                  {p.nickname}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button 
            onClick={onToggleComments}
            className="w-full py-2 border border-black/10 text-ink/60 text-xs uppercase tracking-widest hover:bg-ink hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={14} />
            {t.comment}
          </button>
        </div>
      </div>

      {isCommentsOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-8 pt-8 border-t border-black/5"
        >
          <div className="space-y-4 mb-6">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <img src={c.avatar} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex-1 bg-white/50 p-3 rounded-sm text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-serif text-xs">{c.nickname}</span>
                    <span className="text-[10px] opacity-40">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p>{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          {user && (
            <div className="flex gap-2">
              <input 
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="说点什么..."
                className="flex-1 bg-white border border-black/10 p-2 text-sm outline-none focus:border-accent"
              />
              <button 
                onClick={() => onAddComment(activity.id)}
                className="px-4 py-2 bg-accent text-white text-xs uppercase tracking-widest"
              >
                {t.save}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Activities({ t, activities, user, onParticipate, onAddActivity, lang }: { t: any, activities: Activity[], user: User | null, onParticipate: (id: number, n: string) => any, onAddActivity: () => void, lang: Language }) {
  const [activeComments, setActiveComments] = useState<number | null>(null);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const now = new Date();
  const upcoming = activities.filter(a => {
    const d = new Date(a.time);
    return isNaN(d.getTime()) || d >= now;
  });
  const past = activities.filter(a => {
    const d = new Date(a.time);
    return !isNaN(d.getTime()) && d < now;
  });

  const fetchComments = async (id: number) => {
    const res = await fetch(`/api/activities/${id}/comments`);
    const data = await res.json();
    setComments(data);
    setActiveComments(id);
  };

  const handleAddComment = async (id: number) => {
    if (!user || !newComment) return;
    await fetch('/api/activity-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId: id, userId: user.id, content: newComment })
    });
    setNewComment('');
    fetchComments(id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-6"
    >
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-3xl font-serif">{t.activities}</h2>
        <button 
          onClick={onAddActivity}
          className="flex items-center gap-2 text-accent border border-accent/30 px-4 py-2 rounded-full hover:bg-accent hover:text-white transition-all"
        >
          <Plus size={18} />
          <span className="text-sm font-medium">{t.addActivity}</span>
        </button>
      </div>
      
      <div className="space-y-16">
        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-20 opacity-40 italic">
            暂无活动 (No activities)
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="space-y-12">
            <h4 className="text-xs uppercase tracking-[0.2em] opacity-40 border-b border-black/5 pb-2">{t.upcomingActivities}</h4>
            {upcoming.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                t={t}
                user={user}
                onParticipate={onParticipate}
                isCommentsOpen={activeComments === activity.id}
                comments={activeComments === activity.id ? comments : []}
                onToggleComments={() => activeComments === activity.id ? setActiveComments(null) : fetchComments(activity.id)}
                onAddComment={handleAddComment}
                newComment={newComment}
                setNewComment={setNewComment}
                lang={lang}
              />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-12 pt-8">
            <h4 className="text-xs uppercase tracking-[0.2em] opacity-40 border-b border-black/5 pb-2">{t.pastActivities}</h4>
            {past.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                t={t}
                user={user}
                onParticipate={onParticipate}
                isCommentsOpen={activeComments === activity.id}
                comments={activeComments === activity.id ? comments : []}
                onToggleComments={() => activeComments === activity.id ? setActiveComments(null) : fetchComments(activity.id)}
                onAddComment={handleAddComment}
                newComment={newComment}
                setNewComment={setNewComment}
                lang={lang}
                isPast 
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AddActivityForm({ t, onSubmit, onCancel, isSaving, lang }: { t: any, onSubmit: (title: string, announcement: string, location: string, time: string, posters: string[]) => void, onCancel: () => void, isSaving: boolean, lang: Language }) {
  const [title, setTitle] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [posters, setPosters] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosters([...posters, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePoster = (index: number) => {
    setPosters(posters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.activityTitle}</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-black/10 py-2 outline-none focus:border-accent font-serif text-lg"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.activityAnnouncement}</label>
        <textarea 
          value={announcement} 
          onChange={e => setAnnouncement(e.target.value)}
          rows={3}
          className="w-full bg-transparent border border-black/10 p-2 outline-none focus:border-accent italic text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.activityLocation}</label>
          <input 
            type="text" 
            value={location} 
            onChange={e => setLocation(e.target.value)}
            className="w-full bg-transparent border-b border-black/10 py-2 outline-none focus:border-accent text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.activityTime}</label>
          <input 
            type="text" 
            value={time} 
            onChange={e => setTime(e.target.value)}
            className="w-full bg-transparent border-b border-black/10 py-2 outline-none focus:border-accent text-sm"
            placeholder="YYYY-MM-DD HH:MM"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">{t.activityPosters}</label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {posters.map((poster, idx) => (
            <div key={idx} className="relative aspect-[9/16]">
              <img src={poster} className="w-full h-full object-cover rounded-sm" referrerPolicy="no-referrer" />
              <button onClick={() => removePoster(idx)} className="absolute -top-1 -right-1 bg-black text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center">×</button>
            </div>
          ))}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[9/16] border-2 border-dashed border-black/10 flex flex-col items-center justify-center hover:border-accent transition-colors"
          >
            <Plus size={16} className="opacity-40" />
            <span className="text-[8px] uppercase tracking-tighter opacity-40">{t.uploadPoster}</span>
          </button>
        </div>
      </div>
      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} className="flex-1 py-3 border border-black/10 text-sm uppercase tracking-widest">{t.cancel}</button>
        <button 
          onClick={() => {
            if (!title) {
              alert(lang === 'zh' ? '请输入活动标题' : 'Please enter activity title');
              return;
            }
            onSubmit(title, announcement, location, time, posters);
          }}
          disabled={isSaving}
          className="flex-1 py-3 bg-accent text-white font-serif tracking-widest disabled:opacity-50"
        >
          {isSaving ? (lang === 'zh' ? '保存中...' : 'Saving...') : t.save}
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-paper w-full max-w-lg rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-black/10 flex justify-between items-center">
          <h3 className="font-serif text-xl tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">×</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function AddBookForm({ t, onSubmit, onCancel, isSaving, lang }: { t: any, onSubmit: (t: string, c: string, d: string) => void, onCancel: () => void, isSaving: boolean, lang: Language }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState('https://picsum.photos/seed/book/300/400');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCover(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center mb-6">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <div 
          className="w-32 aspect-[3/4] relative group cursor-pointer overflow-hidden rounded-sm shadow-md border border-black/5" 
          onClick={() => fileInputRef.current?.click()}
        >
          <img src={cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
            <ImageIcon size={24} />
            <span className="text-[8px] uppercase tracking-widest mt-1">上传封面</span>
          </div>
        </div>
        <p className="text-[10px] opacity-40 mt-2 uppercase tracking-widest">点击图片上传自定义封面</p>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.bookTitle}</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-black/10 py-2 outline-none focus:border-accent font-serif text-lg"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.bookDescription}</label>
        <textarea 
          value={description} 
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-transparent border border-black/10 p-2 outline-none focus:border-accent italic text-sm"
        />
      </div>
      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} className="flex-1 py-3 border border-black/10 text-sm uppercase tracking-widest">{t.cancel}</button>
        <button 
          onClick={() => {
            if (!title) {
              alert(lang === 'zh' ? '请输入书籍标题' : 'Please enter book title');
              return;
            }
            onSubmit(title, cover, description);
          }}
          disabled={isSaving}
          className="flex-1 py-3 bg-accent text-white font-serif tracking-widest disabled:opacity-50"
        >
          {isSaving ? (lang === 'zh' ? '保存中...' : 'Saving...') : t.save}
        </button>
      </div>
    </div>
  );
}

function AddEntryForm({ t, onSubmit, onCancel }: { t: any, onSubmit: (t: string, c: string, i: string, f: string) => void, onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [feelings, setFeelings] = useState('');
  const [image, setImage] = useState('');
  const [mode, setMode] = useState<'input' | 'camera'>('input');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setMode('input');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImage(dataUrl);
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setMode('input');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.entryTitle}</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-black/10 py-2 outline-none focus:border-accent font-serif text-lg"
        />
      </div>

      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => setMode('input')}
          className={`flex-1 py-2 text-xs uppercase tracking-widest border ${mode === 'input' ? 'bg-ink text-white border-ink' : 'border-black/10 opacity-50'}`}
        >
          {t.manualInput}
        </button>
        <button 
          onClick={startCamera}
          className={`flex-1 py-2 text-xs uppercase tracking-widest border flex items-center justify-center gap-2 ${mode === 'camera' ? 'bg-ink text-white border-ink' : 'border-black/10 opacity-50'}`}
        >
          <Camera size={14} />
          {t.takePhoto}
        </button>
      </div>

      {mode === 'camera' ? (
        <div className="relative aspect-video bg-black rounded-sm overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <button 
            onClick={capturePhoto}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-white bg-accent/50"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : (
        <>
          {image && (
            <div className="relative group">
              <img src={image} className="w-full rounded-sm shadow-md" />
              <button onClick={() => setImage('')} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">×</button>
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.entryContent}</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              rows={6}
              className="w-full bg-transparent border border-black/10 p-2 outline-none focus:border-accent text-sm leading-relaxed"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.entryFeelings}</label>
            <textarea 
              value={feelings} 
              onChange={e => setFeelings(e.target.value)}
              rows={2}
              className="w-full bg-transparent border border-black/10 p-2 outline-none focus:border-accent italic text-sm"
            />
          </div>
        </>
      )}

      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} className="flex-1 py-3 border border-black/10 text-sm uppercase tracking-widest">{t.cancel}</button>
        <button 
          onClick={() => (title && (content || image)) && onSubmit(title, content, image, feelings)}
          className="flex-1 py-3 bg-accent text-white font-serif tracking-widest"
        >
          {t.save}
        </button>
      </div>
    </div>
  );
}

function ForwardForm({ t, onSubmit, onCancel }: { t: any, onSubmit: (type: 'read' | 'reread', content: string) => void, onCancel: () => void }) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'read' | 'reread'>('read');

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">{t.selectModule}</label>
        <div className="flex gap-4">
          <button 
            onClick={() => setType('read')}
            className={`flex-1 py-3 font-serif tracking-widest border ${type === 'read' ? 'bg-accent text-white border-accent' : 'border-black/10 opacity-50'}`}
          >
            {t.read}
          </button>
          <button 
            onClick={() => setType('reread')}
            className={`flex-1 py-3 font-serif tracking-widest border ${type === 'reread' ? 'bg-accent text-white border-accent' : 'border-black/10 opacity-50'}`}
          >
            {t.reread}
          </button>
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">{t.entryFeelings} (Optional)</label>
        <textarea 
          value={content} 
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="w-full bg-transparent border border-black/10 p-2 outline-none focus:border-accent text-sm"
          placeholder="分享此刻的心情..."
        />
      </div>
      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} className="flex-1 py-3 border border-black/10 text-sm uppercase tracking-widest">{t.cancel}</button>
        <button 
          onClick={() => onSubmit(type, content)}
          className="flex-1 py-3 bg-accent text-white font-serif tracking-widest"
        >
          {t.forward}
        </button>
      </div>
    </div>
  );
}
