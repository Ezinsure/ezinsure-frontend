'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  RemoveFormatting,
  MessageSquareText,
  Users,
  Briefcase,
  Shield,
  Globe2,
  Send,
  Smartphone,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Values sent as JSON `recipient` to the bulk SMS API. */
export type SmsRecipientScope = 'CLIENTS' | 'AGENTS' | 'ADMINS' | 'ALL';

const AUDIENCE_OPTIONS: {
  id: SmsRecipientScope;
  title: string;
  subtitle: string;
  icon: typeof Users;
  accent: string;
}[] = [
  {
    id: 'CLIENTS',
    title: 'Clients',
    subtitle: 'Policyholders & applicants',
    icon: Users,
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-200/80',
  },
  {
    id: 'AGENTS',
    title: 'Agents',
    subtitle: 'Sales agents only',
    icon: Briefcase,
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-200/80',
  },
  {
    id: 'ADMINS',
    title: 'Admins',
    subtitle: 'Operations administrators',
    icon: Shield,
    accent: 'from-violet-500/20 to-purple-500/10 border-violet-200/80',
  },
  {
    id: 'ALL',
    title: 'Everyone',
    subtitle: 'Clients, agents & admins',
    icon: Globe2,
    accent: 'from-rose-500/20 to-pink-500/10 border-rose-200/80',
  },
];

const SMS_SINGLE_LENGTH = 160;
const SMS_UNICODE_SINGLE = 70;

export function smsStats(text: string): {
  chars: number;
  segments: number;
  encoding: 'GSM-7' | 'Unicode';
} {
  const chars = text.length;
  const unicode = /[^\u0000-\u007F]/.test(text);
  const per = unicode ? SMS_UNICODE_SINGLE : SMS_SINGLE_LENGTH;
  const segments = chars === 0 ? 0 : Math.ceil(chars / per);
  return { chars, segments, encoding: unicode ? 'Unicode' : 'GSM-7' };
}

interface SmsBroadcastPanelProps {
  message: string;
  onMessageChange: (plainText: string) => void;
  recipientScope: SmsRecipientScope;
  onRecipientScopeChange: (scope: SmsRecipientScope) => void;
  onSend: () => void;
  isSending: boolean;
  messageError?: string;
}

export function SmsBroadcastPanel({
  message,
  onMessageChange,
  recipientScope,
  onRecipientScopeChange,
  onSend,
  isSending,
  messageError,
}: SmsBroadcastPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const skipNextInput = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (message === '' && el.innerText.trim() !== '') {
      el.innerHTML = '';
    }
  }, [message]);

  const runCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      /* ignore */
    }
    if (editorRef.current) {
      onMessageChange(editorRef.current.innerText);
    }
  };

  const handleInput = () => {
    if (skipNextInput.current) {
      skipNextInput.current = false;
      return;
    }
    if (!editorRef.current) return;
    onMessageChange(editorRef.current.innerText);
  };

  const clearFormatting = () => {
    if (!editorRef.current) return;
    const plain = editorRef.current.innerText;
    skipNextInput.current = true;
    editorRef.current.innerHTML = '';
    editorRef.current.innerText = plain;
    onMessageChange(plain);
  };

  const stats = smsStats(message);
  const canSend = message.trim().length > 0 && !isSending;
  const showPlaceholder = message.length === 0 && !focused;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50/80 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)] pointer-events-none" />

      <div className="relative p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <MessageSquareText className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Bulk SMS broadcast</h3>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">
                Compose with formatting for clarity; the live preview shows the plain text that will be sent over SMS.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
            <span>Recipients</span>
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-4">
            Choose who receives this message. The request body is{' '}
            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono">
              {'{ recipient, message }'}
            </code>{' '}
            where <code className="text-[11px] font-mono">recipient</code> is{' '}
            <span className="font-mono text-[11px]">CLIENTS</span>,{' '}
            <span className="font-mono text-[11px]">AGENTS</span>,{' '}
            <span className="font-mono text-[11px]">ADMINS</span>, or{' '}
            <span className="font-mono text-[11px]">ALL</span>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AUDIENCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = recipientScope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onRecipientScopeChange(opt.id)}
                  className={[
                    'group relative cursor-pointer text-left rounded-xl border-2 p-4 transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                    selected
                      ? `border-blue-500 bg-gradient-to-br ${opt.accent} shadow-md sm:scale-[1.02]`
                      : 'border-slate-200/90 bg-white/80 hover:border-slate-300 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2',
                      selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="font-semibold text-sm text-slate-900">{opt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.subtitle}</div>
                  {selected && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
            Message <span className="text-red-500">*</span>
          </label>

          <div
            className={[
              'rounded-xl border-2 bg-white shadow-inner transition-colors',
              messageError ? 'border-red-400' : focused ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/90 px-2 py-2 rounded-t-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-2 hidden sm:inline">
                Format
              </span>
              <ToolbarBtn icon={Bold} label="Bold" onClick={() => runCmd('bold')} />
              <ToolbarBtn icon={Italic} label="Italic" onClick={() => runCmd('italic')} />
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarBtn icon={List} label="Bullet list" onClick={() => runCmd('insertUnorderedList')} />
              <ToolbarBtn icon={ListOrdered} label="Numbered list" onClick={() => runCmd('insertOrderedList')} />
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarBtn icon={RemoveFormatting} label="Clear formatting" onClick={clearFormatting} />
            </div>

            <div className="relative min-h-[160px] max-h-[280px]">
              {showPlaceholder && (
                <span className="absolute left-4 top-3 text-sm text-slate-400 pointer-events-none select-none z-0">
                  Type your announcement…
                </span>
              )}
              <div
                ref={editorRef}
                role="textbox"
                aria-multiline
                aria-label="SMS message body"
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="relative z-[1] min-h-[160px] max-h-[280px] overflow-y-auto px-4 py-3 text-sm text-slate-900 outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              />
            </div>
          </div>

          {messageError && <p className="text-xs text-red-600 mt-2">{messageError}</p>}

          <div className="mt-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 text-slate-600">
              <Smartphone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                <strong className="text-slate-700">{stats.chars}</strong> characters ·{' '}
                <strong className="text-slate-700">{stats.encoding}</strong> · ~
                {stats.segments || (stats.chars ? 1 : 0)} segment
                {(stats.segments || (stats.chars ? 1 : 0)) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-slate-400 max-w-xl">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Carriers deliver plain text; bold and lists are for drafting — recipients see readable plain text.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-950/[0.02] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live SMS preview
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-slate-800 min-h-[3rem]">
            {message.trim() ? message : '— Nothing to preview yet —'}
          </pre>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-3 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="primary"
            onClick={onSend}
            disabled={!canSend}
            className="w-full sm:w-auto min-h-[44px] gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg shadow-blue-500/20"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending…' : 'Send broadcast'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
