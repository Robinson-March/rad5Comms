import { useState, useEffect } from 'react';
import Aside from '../components/aside/Aside';
import Main from '../components/main/Main';
import ThreadPane from '../components/threadPane/ThreadPane';

function HomePage() {
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1000);
  const [activeView, setActiveView] = useState<'aside' | 'main' | 'thread'>('aside');

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1000;
      setIsMobile(mobile);
      // Reset view when switching from mobile → desktop
      if (!mobile && activeView !== 'aside') {
        setActiveView('aside');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeView]);

  const toggleThreadPane = () => {
    setIsThreadOpen((prev) => {
      const next = !prev;
      if (isMobile) {
        setActiveView(next ? 'thread' : 'main');
      }
      return next;
    });
  };

  const handleSelectChat = () => {
    if (isMobile) {
      setActiveView('main');
    }
    // In real app: set current chat ID, load messages, etc.
  };

  const goBackToAside = () => setActiveView('aside');
  const goBackToMain = () => {
    setIsThreadOpen(false);
    setActiveView('main');
  };

  const mobileViewClass = isMobile
    ? 'absolute inset-0 transform transition-transform duration-300 ease-in-out'
    : '';

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-offwhite">
      {/* Aside / Sidebar */}
      <div
        className={`
          ${isMobile
            ? `${mobileViewClass} ${
                activeView === 'aside' ? 'translate-x-0' : '-translate-x-full'
              } z-30`
            : 'w-[280px] min-w-[260px] h-full border-r border-border flex-shrink-0'}
        `}
      >
        <Aside onSelectChat={handleSelectChat} />
      </div>

      {/* Main chat area */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 h-full
          ${isMobile
            ? `${mobileViewClass} ${
                activeView === 'main' ? 'translate-x-0' : 'translate-x-full'
              } z-20`
            : ''}
        `}
      >
        <Main
          isThreadOpen={isThreadOpen}
          toggleThreadPane={toggleThreadPane}
          onBack={isMobile ? goBackToAside : undefined}
        />
      </div>

      {/* Thread Pane / Info panel */}
      <div
        className={`
          ${isMobile
            ? `${mobileViewClass} ${
                activeView === 'thread' ? 'translate-x-0' : 'translate-x-full'
              } z-40 bg-white`
            : `h-full border-l border-border transition-all duration-300 ease-in-out ${
                isThreadOpen ? 'w-[320px] min-w-[300px]' : 'w-0 overflow-hidden'
              }`}
        `}
      >
        {(isMobile ? activeView === 'thread' : isThreadOpen) && (
          <ThreadPane
            isGroup={true}
            isOpen={true}
            onToggle={toggleThreadPane}
            onBack={isMobile ? goBackToMain : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default HomePage;