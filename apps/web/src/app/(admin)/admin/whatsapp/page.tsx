'use client';
import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import dayjs from 'dayjs';
import { MessageSquare, ChevronRight, Phone, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const STATE_CONFIG: Record<string, { label: string; cls: string }> = {
  IDLE:                  { label: 'Inactivo',          cls: 'badge-gray' },
  AWAITING_LOCATION:     { label: 'Esp. ubicación',    cls: 'badge-yellow' },
  AWAITING_CONFIRMATION: { label: 'Esp. confirmación', cls: 'badge-blue' },
};

const INTENT_LABELS: Record<string, string> = {
  CHECK_IN:    'Entrada',
  CHECK_OUT:   'Salida',
  BREAK_START: 'Pausa',
  BREAK_END:   'Fin pausa',
  STATUS:      'Estado',
  HOURS:       'Horas',
};

export default function WhatsAppPage() {
  return (
    <Suspense fallback={null}>
      <WhatsAppPageInner />
    </Suspense>
  );
}

function WhatsAppPageInner() {
  const globalFilters = useGlobalFilters();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['whatsapp-conversations', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/whatsapp/conversations', { params: globalFilters.httpParams }).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: messages } = useQuery({
    queryKey: ['whatsapp-messages', selected, ...globalFilters.queryKeyPart],
    queryFn: () => api.get(`/whatsapp/conversations/${selected}/messages`, { params: globalFilters.httpParams }).then((r) => r.data),
    enabled: !!selected,
    refetchInterval: 5_000,
  });

  const convList: any[] = conversations?.data ?? conversations ?? [];
  const msgList: any[] = messages?.data ?? messages ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
          <MessageSquare size={18} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp</h1>
          <p className="text-sm text-slate-500">Conversaciones de fichaje por WhatsApp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[500px]">
        {/* Conversation list */}
        <div className="md:col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {convList.length} conversaciones
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Cargando…</div>
            ) : convList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                Sin conversaciones aún
              </div>
            ) : (
              convList.map((conv: any) => {
                const stateCfg = STATE_CONFIG[conv.state] ?? STATE_CONFIG.IDLE;
                const isActive = selected === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelected(conv.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${isActive ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {conv.employee?.firstName} {conv.employee?.lastName}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-slate-400" />
                          <p className="text-xs text-slate-400 font-mono">{conv.phone}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`${stateCfg.cls} text-[10px]`}>{stateCfg.label}</span>
                        {conv.lastMessageAt && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {dayjs(conv.lastMessageAt).format('HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    {conv.pendingIntent && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <Clock size={10} className="text-amber-500" />
                        <p className="text-[10px] text-amber-600 font-medium">
                          Pendiente: {INTENT_LABELS[conv.pendingIntent] ?? conv.pendingIntent}
                        </p>
                        {conv.contextExpiresAt && (
                          <span className="text-[10px] text-slate-400 ml-auto">
                            exp. {dayjs(conv.contextExpiresAt).format('HH:mm')}
                          </span>
                        )}
                      </div>
                    )}
                    {isActive && (
                      <ChevronRight size={14} className="text-indigo-500 ml-auto mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className="md:col-span-3 card p-0 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
              <MessageSquare size={40} className="opacity-20" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              {(() => {
                const conv = convList.find((c: any) => c.id === selected);
                return conv ? (
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                      {`${conv.employee?.firstName?.[0] ?? ''}${conv.employee?.lastName?.[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {conv.employee?.firstName} {conv.employee?.lastName}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{conv.phone}</p>
                    </div>
                    <span className={`ml-auto ${(STATE_CONFIG[conv.state] ?? STATE_CONFIG.IDLE).cls} text-xs`}>
                      {(STATE_CONFIG[conv.state] ?? STATE_CONFIG.IDLE).label}
                    </span>
                  </div>
                ) : null;
              })()}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
                {msgList.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-8">Sin mensajes</div>
                ) : (
                  [...msgList].reverse().map((msg: any) => {
                    const isOut = msg.direction === 'OUTBOUND';
                    return (
                      <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          isOut
                            ? 'bg-emerald-500 text-white rounded-br-sm'
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                        }`}>
                          {msg.type === 'LOCATION' ? (
                            <div className="flex items-center gap-2">
                              <span>📍</span>
                              <span className="font-mono text-xs">
                                {msg.latitude?.toFixed(5)}, {msg.longitude?.toFixed(5)}
                              </span>
                            </div>
                          ) : (
                            <p className="leading-relaxed">{msg.body}</p>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : ''}`}>
                            {isOut
                              ? <ArrowUpRight size={10} className="opacity-60" />
                              : <ArrowDownLeft size={10} className="opacity-40" />
                            }
                            <span className={`text-[10px] ${isOut ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {dayjs(msg.createdAt).format('HH:mm')}
                            </span>
                            {msg.intentParsed && (
                              <span className="text-[10px] opacity-70 ml-1">
                                · {INTENT_LABELS[msg.intentParsed] ?? msg.intentParsed}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
