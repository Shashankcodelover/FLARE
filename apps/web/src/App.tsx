import { useEffect, useState, startTransition, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CommandHeader } from './components/CommandHeader';
import { StatsBar } from './components/StatsBar';
import { RoleGateway } from './components/gateway/RoleGateway';
import { HQCommandDeck } from './components/hq/HQCommandDeck';
import { FieldResponderDeck } from './components/responder/FieldResponderDeck';
import { LogisticsDeck } from './components/logistics/LogisticsDeck';
import { Modal, Button } from '@mirage/ui';
import { useSocket } from './hooks/useSocket';
import { useP2PSync } from '@mirage/crdt-logic';
import { useVolunteerSim } from './hooks/useVolunteerSim';
import { useAppTheme } from './hooks/ThemeContext';
import { API_URL } from './config';
import type { GeofenceAlert } from '@mirage/shared-types';

export type DeckView = 'gateway' | 'hq' | 'responder' | 'logistics';

export default function App() {
  const { socket, connected } = useSocket();
  const { peerCount, syncStatus } = useP2PSync(socket);
  const { themeMode, lang, triggerHaptic, toggleTheme } = useAppTheme();

  // Active Deck navigation
  const [activeDeck, setActiveDeck] = useState<DeckView>(() => {
    return (localStorage.getItem('mirage_active_deck') as DeckView) || 'gateway';
  });

  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [sosTriggered, setSosTriggered] = useState(false);

  // FEMA SITREP states
  const [showSitrep, setShowSitrep] = useState(false);
  const [sitrepText, setSitrepText] = useState('');

  // 5-second Undo buffer states
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    type: 'dispatch' | 'recall';
    volunteerId: string;
    zoneId?: string;
    message: string;
  } | null>(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState(5);
  const countdownTimerRef = useRef<any>(null);

  // Voice Command states
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const recognitionRef = useRef<any>(null);

  const {
    volunteers,
    zoneNeeds,
    dispatchMessages,
    selectedVolunteer,
    setSelectedVolunteer,
    dispatchVolunteer,
    recallVolunteer,
    roleIcons,
    roleColors,
    zoneConfigs,
  } = useVolunteerSim();

  const handleSelectDeck = (deck: DeckView) => {
    setActiveDeck(deck);
    localStorage.setItem('mirage_active_deck', deck);
    triggerHaptic('tap');
  };

  // Socket zone breach listener
  useEffect(() => {
    if (!socket) return;
    socket.on('zone:enter', (alert: GeofenceAlert) => {
      startTransition(() => {
        setAlerts((prev) => [alert, ...prev].slice(0, 20));
      });
      triggerHaptic('warning');
    });
    return () => {
      socket.off('zone:enter');
    };
  }, [socket, triggerHaptic]);

  // Fetch FEMA SITREP report
  useEffect(() => {
    if (showSitrep) {
      setSitrepText('Loading FEMA ICS briefing...');
      fetch(`${API_URL}/api/v1/ai/sitrep`)
        .then((res) => res.text())
        .then((text) => setSitrepText(text))
        .catch((err) => {
          console.error(err);
          setSitrepText('Failed to generate Situation Briefing Report.');
        });
    }
  }, [showSitrep]);

  // Handle the 5-second Undo countdown
  useEffect(() => {
    if (pendingAction) {
      setUndoTimeLeft(5);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      countdownTimerRef.current = setInterval(() => {
        setUndoTimeLeft((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            executePendingAction(pendingAction);
            setPendingAction(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [pendingAction]);

  const executePendingAction = (action: typeof pendingAction) => {
    if (!action) return;
    if (action.type === 'dispatch' && action.zoneId) {
      dispatchVolunteer(action.volunteerId, action.zoneId);
    } else if (action.type === 'recall') {
      recallVolunteer(action.volunteerId);
    }
    triggerHaptic('success');
  };

  const handleDispatchClick = (volunteerId: string, zoneId: string) => {
    const vol = volunteers.find((v) => v.id === volunteerId);
    const zone = zoneConfigs.find((z) => z.zoneId === zoneId);
    if (!vol || !zone) return;

    setPendingAction({
      id: Math.random().toString(),
      type: 'dispatch',
      volunteerId,
      zoneId,
      message: `Dispatching ${vol.name} to ${zone.zoneName}`,
    });
    triggerHaptic('tap');
  };

  const handleRecallClick = (volunteerId: string) => {
    const vol = volunteers.find((v) => v.id === volunteerId);
    if (!vol) return;

    setPendingAction({
      id: Math.random().toString(),
      type: 'recall',
      volunteerId,
      message: `Recalling ${vol.name} to base`,
    });
    triggerHaptic('tap');
  };

  const handleUndo = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setPendingAction(null);
    triggerHaptic('success');
  };

  // --- Voice Command Web Speech API Integration ---
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript.toLowerCase();
        setVoiceTranscript(transcript);
        processVoiceCommand(transcript);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    triggerHaptic('tap');
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setVoiceTranscript('');
      setVoiceFeedback('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const processVoiceCommand = (command: string) => {
    if (command.includes('sos') || command.includes('emergency')) {
      setSosTriggered(true);
      triggerHaptic('sos');
      setVoiceFeedback('SOS Alert broadcasted successfully.');
      return;
    }

    if (command.includes('clear') && (command.includes('alert') || command.includes('alert log'))) {
      setAlerts([]);
      triggerHaptic('success');
      setVoiceFeedback('Alert feed cleared.');
      return;
    }

    if (
      command.includes('toggle contrast') ||
      command.includes('toggle theme') ||
      command.includes('high contrast') ||
      command.includes('tactical mode')
    ) {
      toggleTheme();
      setVoiceFeedback('Toggled theme display mode.');
      return;
    }

    if (command.includes('gateway') || command.includes('home')) {
      handleSelectDeck('gateway');
      setVoiceFeedback('Navigating to Role Gateway.');
      return;
    }

    if (command.includes('hq') || command.includes('command')) {
      handleSelectDeck('hq');
      setVoiceFeedback('Navigating to HQ Command Deck.');
      return;
    }

    if (command.includes('responder') || command.includes('field')) {
      handleSelectDeck('responder');
      setVoiceFeedback('Navigating to Field Responder Deck.');
      return;
    }

    if (command.includes('logistics') || command.includes('supply')) {
      handleSelectDeck('logistics');
      setVoiceFeedback('Navigating to Logistics Sync Deck.');
      return;
    }

    setVoiceFeedback("Command not recognized. Try 'open HQ', 'SOS', or 'toggle theme'.");
    triggerHaptic('warning');
  };

  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200"
    >
      {/* Dynamic Role Gateway (Splash Screen) */}
      {activeDeck === 'gateway' ? (
        <RoleGateway
          onSelectRole={(role) => handleSelectDeck(role)}
          connected={connected}
          peerCount={peerCount}
          activeZonesCount={zoneConfigs.length}
        />
      ) : (
        <>
          {/* Universal Command Header */}
          <CommandHeader
            connected={connected}
            peerCount={peerCount}
            syncStatus={syncStatus}
            alertCount={alerts.length}
            onShowSitrep={() => setShowSitrep(true)}
            activeDeck={activeDeck}
            onSelectDeck={handleSelectDeck}
          />

          {/* Incident Telemetry Stats Bar */}
          <StatsBar />

          {/* Operational View Deck with Animated Transitions */}
          <div className="flex-1 flex overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeDeck === 'hq' && (
                <motion.div
                  key="hq"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex overflow-hidden"
                >
                  <HQCommandDeck
                    socket={socket}
                    volunteers={volunteers}
                    zoneNeeds={zoneNeeds}
                    dispatchMessages={dispatchMessages}
                    selectedVolunteer={selectedVolunteer}
                    onSelectVolunteer={setSelectedVolunteer}
                    onDispatch={handleDispatchClick}
                    onRecall={handleRecallClick}
                    roleIcons={roleIcons}
                    roleColors={roleColors}
                    zoneConfigs={zoneConfigs}
                    alerts={alerts}
                    onDismissAlert={(i) => setAlerts((p) => p.filter((_, idx) => idx !== i))}
                    triggerHaptic={triggerHaptic}
                  />
                </motion.div>
              )}

              {activeDeck === 'responder' && (
                <motion.div
                  key="responder"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex overflow-hidden"
                >
                  <FieldResponderDeck
                    socket={socket}
                    volunteers={volunteers}
                    selectedVolunteer={selectedVolunteer}
                    onSelectVolunteer={setSelectedVolunteer}
                    roleIcons={roleIcons}
                    roleColors={roleColors}
                    peerCount={peerCount}
                    syncStatus={syncStatus}
                    triggerHaptic={triggerHaptic}
                    onSosTriggered={() => setSosTriggered(true)}
                  />
                </motion.div>
              )}

              {activeDeck === 'logistics' && (
                <motion.div
                  key="logistics"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex overflow-hidden"
                >
                  <LogisticsDeck socket={socket} triggerHaptic={triggerHaptic} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Voice Assistant Trigger */}
            <div className="absolute bottom-6 right-6 z-[1050] flex items-center gap-2">
              <AnimatePresence>
                {(isListening || voiceFeedback) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-panel px-3 py-2 bg-slate-900/90 text-white rounded-xl shadow-xl max-w-xs border border-sky-500/40"
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-sky-400">
                      {isListening ? 'Listening for command...' : 'Voice Assistant'}
                    </div>
                    <div className="text-xs font-semibold mt-0.5 font-mono">
                      {isListening ? voiceTranscript || 'Say "open HQ" or "SOS"...' : voiceFeedback}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={toggleVoiceListening}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'glass-panel bg-slate-900/80 text-sky-400 hover:text-white border border-sky-500/30'
                }`}
                title="Voice Assistant"
              >
                {isListening ? '🎙️' : '🎤'}
              </button>
            </div>

            {/* 5-Second Undo Toast Notification Overlay */}
            <AnimatePresence>
              {pendingAction && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1100] px-4 py-3 rounded-2xl bg-slate-950/95 border-2 border-red-500/80 text-white shadow-2xl flex items-center gap-4 backdrop-blur-xl min-w-[320px] justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-100">
                      {pendingAction.message}
                    </span>
                    <span className="text-[10px] text-red-400 font-mono">
                      Executing dispatch in {undoTimeLeft}s...
                    </span>
                  </div>
                  <Button
                    variant="tactical-orange"
                    size="sm"
                    onClick={handleUndo}
                    className="font-bold text-xs"
                  >
                    UNDO
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Full-screen Emergency SOS Beacon Broadcast Overlay */}
          <AnimatePresence>
            {sosTriggered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-7xl mb-4"
                >
                  🚨
                </motion.div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-tactical text-red-500 mb-2 uppercase">
                  EMERGENCY SOS DISTRESS ACTIVE
                </h1>
                <p className="text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
                  GPS distress coordinates have been broadcasted across all local WebRTC mesh peers and central incident commanders.
                </p>
                <Button
                  variant="tactical-orange"
                  size="lg"
                  onClick={() => {
                    setSosTriggered(false);
                    triggerHaptic('success');
                  }}
                  className="font-bold px-8"
                >
                  Cancel / Silence SOS Beacon
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FEMA SITREP Modal */}
          <Modal
            isOpen={showSitrep}
            onClose={() => setShowSitrep(false)}
            title="📋 FEMA ICS-209 Incident Briefing"
            maxWidth="max-w-2xl"
            footer={
              <div className="flex gap-3 w-full">
                <Button
                  variant="tactical-orange"
                  size="sm"
                  className="flex-1 font-bold"
                  onClick={() => {
                    navigator.clipboard.writeText(sitrepText);
                    triggerHaptic('success');
                    alert('SITREP copied to clipboard.');
                  }}
                >
                  Copy Report
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSitrep(false)}>
                  Close
                </Button>
              </div>
            }
          >
            <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto border border-slate-800">
              {sitrepText}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
