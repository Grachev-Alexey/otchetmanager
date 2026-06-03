import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api, ApiError } from '../api/client';
import type { StaffMember } from '../types';

const N = 4;

export default function LoginPage({ onLogin }: { onLogin: (user: StaffMember) => void }) {
  const [digits, setDigits]       = useState<string[]>(Array(N).fill(''));
  const [activeBox, setActiveBox] = useState(0);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [shake, setShake]         = useState(false);
  const inputRefs                 = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (i: number) => {
    const c = Math.max(0, Math.min(N - 1, i));
    inputRefs.current[c]?.focus();
    setActiveBox(c);
  };

  const focusActive = () => {
    const first = digits.findIndex(d => !d);
    focusBox(first === -1 ? N - 1 : first);
  };

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = digit;
    setDigits(next); setError('');
    if (digit && i < N - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) { next[i] = ''; setDigits(next); }
      else if (i > 0) { next[i - 1] = ''; setDigits(next); focusBox(i - 1); }
    }
    if (e.key === 'Enter') submit(digits.join(''));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const raw  = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, N);
    const next = raw.split('').concat(Array(N).fill('')).slice(0, N);
    setDigits(next);
    focusBox(Math.min(raw.length, N - 1));
  };

  const submit = async (pin: string) => {
    if (pin.length < N || loading) return;
    setLoading(true); setError('');
    try {
      const { success, user } = await api.auth.login(pin);
      if (success) onLogin(user);
    } catch (err) {
      setDigits(Array(N).fill(''));
      setShake(true);
      setTimeout(() => { setShake(false); focusBox(0); }, 450);
      setError(err instanceof ApiError && err.status === 429 ? err.message : 'Неверный ПИН‑код');
    } finally {
      setLoading(false);
    }
  };

  const pin   = digits.join('');
  const canGo = pin.length === N && !loading;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 antialiased select-none relative overflow-hidden"
      style={{ background: '#f8f8ff' }}
      onClick={focusActive}
    >
      {/* Vivid ambient blobs — give glass something to blur */}
      <div className="pointer-events-none absolute inset-0">
        <div style={{ position:'absolute', top:'-120px', left:'-80px',  width:'520px', height:'520px', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.38) 0%, transparent 70%)', filter:'blur(1px)' }} />
        <div style={{ position:'absolute', bottom:'-140px', right:'-60px', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.32) 0%, transparent 70%)', filter:'blur(1px)' }} />
        <div style={{ position:'absolute', top:'55%', left:'5%', width:'320px', height:'320px', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)' }} />
        <div style={{ position:'absolute', top:'10%', right:'8%', width:'280px', height:'280px', borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          animate={shake ? { x: [-16, 16, -11, 11, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          /* Frosted-glass card */
          className="flex flex-col items-center gap-8 px-10 py-9 rounded-[28px]"
          style={{
            width: 340,
            background: 'rgba(255,255,255,0.52)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.72)',
            boxShadow: [
              '0 24px 64px rgba(80,60,200,0.18)',
              '0 4px 20px rgba(0,0,0,0.06)',
              'inset 0 1.5px 0 rgba(255,255,255,0.95)',
              'inset 0 -1px 0 rgba(0,0,0,0.03)',
            ].join(', '),
          }}
        >

          {/* PIN boxes */}
          <div className="flex gap-3">
            {digits.map((d, i) => {
              const isActive = activeBox === i;
              const isFilled = !!d;
              return (
                <div key={i} className="relative" style={{ width: 66, height: 72 }}>
                  {/* Glass box */}
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-all duration-150"
                    style={{
                      borderRadius: 16,
                      background: isFilled
                        ? 'rgba(109,100,255,0.12)'
                        : isActive
                          ? 'rgba(255,255,255,0.85)'
                          : 'rgba(255,255,255,0.45)',
                      border: isFilled
                        ? '1.5px solid rgba(109,100,255,0.35)'
                        : isActive
                          ? '1.5px solid rgba(99,102,241,0.55)'
                          : '1.5px solid rgba(255,255,255,0.6)',
                      boxShadow: isActive
                        ? '0 0 0 3.5px rgba(99,102,241,0.14), 0 6px 20px rgba(80,60,200,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                        : isFilled
                          ? '0 4px 14px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.8)'
                          : '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }}
                  >
                    {isFilled ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                        style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          boxShadow: '0 2px 10px rgba(99,102,241,0.55)',
                        }}
                      />
                    ) : isActive ? (
                      <div style={{ width: 2, height: 24, borderRadius: 2, background: 'rgba(99,102,241,0.7)' }} className="animate-pulse" />
                    ) : null}
                  </div>

                  {/* Invisible keyboard capture */}
                  <input
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={d}
                    autoFocus={i === 0}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onFocus={() => setActiveBox(i)}
                    onPaste={handlePaste}
                    autoComplete={i === 0 ? 'current-password' : 'off'}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                    aria-label={`Цифра ${i + 1}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="-mt-3 text-[11px] font-bold text-rose-500 uppercase tracking-widest text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Button */}
          <button
            onClick={() => submit(pin)}
            disabled={!canGo}
            className="w-full h-[48px] rounded-2xl font-bold text-[11.5px] uppercase tracking-[0.15em] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            style={canGo ? {
              background: 'linear-gradient(135deg, rgba(99,102,241,0.88) 0%, rgba(139,92,246,0.88) 100%)',
              color: '#fff',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 6px 24px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.3)',
            } : {
              background: 'rgba(255,255,255,0.45)',
              color: 'rgba(160,160,180,0.9)',
              border: '1px solid rgba(220,220,235,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Проверка…</>
              : 'Войти'}
          </button>

        </motion.div>
      </motion.div>
    </div>
  );
}
