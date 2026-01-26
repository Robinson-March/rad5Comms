// App.tsx (example – adjust paths/filenames as needed)
import { useState } from 'react';
import Aside from './components/aside/Aside';
import Main from './components/main/Main';
import ThreadPane from './components/threadPane/ThreadPane'; // or whatever you named it

function App() {
  const [isThreadOpen, setIsThreadOpen] = useState(true); // default open
  const toggleThreadPane = () => {
    setIsThreadOpen(prev => !prev);
  };
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left sidebar – fixed */}
      <Aside />

      {/* Main content – grows to fill available space */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Main 
          isThreadOpen={isThreadOpen}
          toggleThreadPane={() => setIsThreadOpen(prev => !prev)}
        />
      </div>

      {/* Right sidebar – conditionally rendered */}
      {isThreadOpen && (
        <ThreadPane 
          isGroup={true}           // or false for 1:1 chats
          isOpen={isThreadOpen}
          onToggle={toggleThreadPane}
        />
      )}
    </div>
  );
}

export default App;