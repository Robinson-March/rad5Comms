import type { ReactNode } from 'react';
import { CheckCircle2, MessageSquareText, Sparkles } from 'lucide-react';

interface AuthScaffoldProps {
  eyebrow: string;
  sideTitle: string;
  sideDescription: string;
  children: ReactNode;
}

const highlights = [
  'Realtime messaging that stays calm under pressure.',
  'Cleaner threads, focused channels, and modern presence cues.',
  'A lighter March visual system from sign in to the workspace.',
];

const AuthScaffold = ({ eyebrow, sideTitle, sideDescription, children }: AuthScaffoldProps) => {
  return (
    <div className="ambient-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-80px] h-72 w-72 rounded-full bg-blue/14 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full border border-white/50 bg-white/30" />
        <div className="absolute right-[16%] top-[10%] h-18 w-18 rounded-full border border-white/50 bg-white/30" />
      </div>

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[38px] border border-white/70 bg-white/72 shadow-[0_40px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue px-6 py-7 text-white sm:px-8 sm:py-9 lg:min-h-[760px] lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.28),transparent_28%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>

            <div className="mt-8 max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/14 shadow-[0_18px_30px_rgba(15,23,42,0.18)] backdrop-blur">
                  <MessageSquareText className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-semibold sm:text-3xl">Rad5 Comms</div>
                  <div className="text-sm text-white/72">March system access</div>
                </div>
              </div>

              <h1 className="mt-8 text-4xl font-semibold leading-tight sm:text-5xl">{sideTitle}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/76 sm:text-lg">{sideDescription}</p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {highlights.map((item) => (
                <div key={item} className="rounded-[24px] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/14">
                      <CheckCircle2 className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="text-sm leading-6 text-white/84">{item}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto hidden rounded-[28px] border border-white/14 bg-white/10 p-5 backdrop-blur lg:block">
              <div className="text-sm font-medium text-white/90">Workspace preview</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/12 px-4 py-4">
                  <div className="text-2xl font-semibold">12</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">Channels</div>
                </div>
                <div className="rounded-2xl bg-white/12 px-4 py-4">
                  <div className="text-2xl font-semibold">98%</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">Uptime</div>
                </div>
                <div className="rounded-2xl bg-white/12 px-4 py-4">
                  <div className="text-2xl font-semibold">Live</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">Presence</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="w-full max-w-lg">{children}</div>
        </section>
      </div>
    </div>
  );
};

export default AuthScaffold;


