'use client';

import { FormEvent, useRef, useState } from 'react';
import {
  ArrowUp,
  CloudSun,
  Compass,
  Droplets,
  MapPin,
  Sparkles,
  Sun,
  ThermometerSun,
  Umbrella,
  Wind,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Widget = {
  html: string;
  toolOutput: unknown;
  outputTemplate?: string;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  widget?: Widget;
};

function widgetDocument(widget: Widget) {
  const payload = JSON.stringify(widget.toolOutput)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  const bridge = `<script>window.openai={toolOutput:${payload}};<\/script>`;
  return widget.html.includes('<head>')
    ? widget.html.replace('<head>', `<head>${bridge}`)
    : `${bridge}${widget.html}`;
}

const suggestions = [
  { icon: Umbrella, label: 'Will it rain in Toronto, Ontario this weekend?' },
  { icon: Sun, label: 'Best time for a walk in New York today?' },
  { icon: Wind, label: 'How cold will it feel in Montreal tomorrow?' },
];

export function WeatherAgent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nextId = useRef(1);

  async function askAgent(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: 'user', content: cleanQuestion },
    ]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: cleanQuestion }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
        widget?: Widget;
      };
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || 'The forecast service is unavailable right now.');
      }
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          content: payload.answer!,
          widget: payload.widget,
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAgent(input);
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]">
              <CloudSun className="size-5" />
            </div>
            <div>
              <p className="font-heading text-[15px] font-semibold tracking-[-0.02em]">Weatherwise</p>
              <p className="text-xs text-muted-foreground">Forecast agent</p>
            </div>
          </div>
          <Badge variant="outline" className="h-7 gap-2 border-emerald-200 bg-emerald-50 px-3 text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Athena connected
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100dvh-80px)] max-w-[1380px] lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-[calc(100dvh-80px)] flex-col px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-14">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
            {messages.length === 0 ? (
              <div className="my-auto py-12">
                <div className="mb-7 grid size-14 place-items-center rounded-[20px] border border-primary/15 bg-primary/8 text-primary">
                  <Sparkles className="size-6" />
                </div>
                <p className="mb-3 text-sm font-medium text-primary">Your personal weather guide</p>
                <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">
                  Plan your day with a clearer forecast.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Ask about any place, date, or activity. I’ll turn the forecast into practical advice you can use.
                </p>
                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {suggestions.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => void askAgent(label)}
                      className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      <Icon className="mb-6 size-5 text-primary transition-transform group-hover:scale-110" />
                      <span className="text-sm leading-5 text-foreground/85">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-end gap-6 py-6" aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-[22px] rounded-br-md bg-primary px-5 py-3.5 text-sm leading-6 text-primary-foreground sm:max-w-[70%]'
                      : message.widget
                        ? 'w-full'
                        : 'max-w-[92%] sm:max-w-[82%]'}
                  >
                    {message.role === 'assistant' && (
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
                        <Sparkles className="size-3.5" /> Weatherwise
                      </div>
                    )}
                    {message.widget ? (
                      <div className="space-y-4">
                        <iframe
                          title="Interactive weather forecast"
                          srcDoc={widgetDocument(message.widget)}
                          sandbox="allow-scripts"
                          className="h-[620px] w-full rounded-[22px] border border-border bg-[#102a56] shadow-sm"
                        />
                        <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                          <summary className="cursor-pointer font-medium text-foreground">View text forecast</summary>
                          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6">{message.content}</p>
                        </details>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>
                    )}
                  </article>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="size-2 animate-pulse rounded-full bg-primary" /> Reading the forecast…
                  </div>
                )}
              </div>
            )}

            <div className="sticky bottom-0 mt-7 bg-gradient-to-t from-background via-background via-80% to-transparent pt-7 pb-1">
              {error && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                  <span>{error}</span>
                  <button type="button" className="font-semibold" onClick={() => setError('')}>Dismiss</button>
                </div>
              )}
              <form onSubmit={submit} className="flex items-end gap-3 rounded-[24px] border border-border bg-card p-2.5 pl-5 shadow-[0_16px_50px_-24px_rgba(15,74,77,.28)] focus-within:border-primary/35 focus-within:ring-3 focus-within:ring-primary/8">
                <label htmlFor="weather-question" className="sr-only">Ask about the weather</label>
                <textarea
                  id="weather-question"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Ask about the weather anywhere…"
                  rows={1}
                  className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="icon-lg" disabled={!input.trim() || loading} aria-label="Send question" className="size-11 rounded-2xl">
                  <ArrowUp className="size-5" />
                </Button>
              </form>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Forecasts can change. Check local alerts for severe weather.</p>
            </div>
          </div>
        </section>

        <aside className="hidden border-l border-border/70 bg-sidebar/65 p-8 lg:flex lg:flex-col">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">At a glance</p>
              <h2 className="mt-2 font-heading text-xl font-semibold tracking-[-0.03em]">Ready for anywhere</h2>
            </div>
            <Compass className="size-5 text-primary" />
          </div>
          <div className="mt-8 overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0b7274,#11484f)] p-6 text-white shadow-[0_24px_60px_-32px_rgba(4,52,56,.7)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-sm text-white/75"><MapPin className="size-3.5" /> Your next place</div>
                <p className="mt-2 text-2xl font-medium tracking-[-0.035em]">Ask to begin</p>
              </div>
              <CloudSun className="size-10 text-amber-200" />
            </div>
            <p className="mt-12 max-w-[250px] text-sm leading-6 text-white/72">
              Current conditions, hourly outlooks, travel planning, and weather-aware activity advice.
            </p>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[
              { icon: ThermometerSun, title: 'Conditions', copy: 'Temperature & feels-like' },
              { icon: Droplets, title: 'Rain', copy: 'Timing & probability' },
              { icon: Wind, title: 'Wind', copy: 'Speed & direction' },
              { icon: Umbrella, title: 'Planning', copy: 'Practical local advice' },
            ].map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-2xl border border-border bg-card/80 p-4">
                <Icon className="size-4 text-primary" />
                <p className="mt-4 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-3 pt-8 text-xs text-muted-foreground">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-3.5" /></span>
            Powered by your Athena weather agent
          </div>
        </aside>
      </div>
    </main>
  );
}
