// components/main/ChatPlaceholder.tsx
import { MessageSquareText, Sparkles } from 'lucide-react';

const ChatPlaceholder = () => {
  return (
    <div className="flex h-full items-center justify-center px-6 pb-12 pt-4 md:px-10">
      <div className="w-full max-w-[720px] rounded-[32px] border border-white/80 bg-white/80 p-8 text-center shadow-[0_24px_55px_rgba(148,163,184,0.18)] backdrop-blur md:p-12">
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue to-cyan-400 text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)]">
          <MessageSquareText className="h-8 w-8" />
        </div>
        <div className="mt-6 text-3xl font-semibold text-text-primary md:text-4xl">Pick a conversation and start building momentum</div>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-text-secondary">
          Jump into a team channel, continue a direct message, or open the thread panel to inspect members and shared media.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-soft px-4 py-2 text-sm font-medium text-blue">
          <Sparkles className="h-4 w-4" />
          Live messages and presence will appear here
        </div>
      </div>
    </div>
  );
};

export default ChatPlaceholder;
