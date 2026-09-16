import { useEffect, useState, startTransition, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GeospatialDashboard } from './components/GeospatialDashboard';
import { ResourcePanel } from './components/ResourcePanel';
import { AlertFeed } from './components/AlertFeed';
import { CommandHeader } from './components/CommandHeader';
import { StatsBar } from './components/StatsBar';
import { VolunteerPanel } from './components/VolunteerPanel';
import { MeshTopology } from './components/MeshTopology';
import { CommsPanel } from './components/CommsPanel';
import { TacticalHub } from './components/TacticalHub';
import { BulkIngestionStudio } from './components/BulkIngestionStudio';
import { useSocket } from './hooks/useSocket';
import { useP2PSync } from '@mirage/crdt-logic';
import { useVolunteerSim } from './hooks/useVolunteerSim';
import { useAppTheme } from './hooks/ThemeContext';
import type { GeofenceAlert } from '@mirage/shared-types';

export default function App() {
  const { socket, connected } = useSocket();
  const { peerCount, syncStatus } = useP2PSync(socket);
  const appTheme = useAppTheme();
  const { styles, themeMode, lang, triggerHaptic, toggleTheme, t } = appTheme;
  
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [activePanel, setActivePanel] = useState<'resources' | 'alerts' | 'volunteers' | 'mesh' | 'comms' | 'ingestion'>('volunteers');
  const [showSosSlider, setShowSosSlider] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);

  // Tactical Hub & FEMA SITREP states
  const [showTacticalHub, setShowTacticalHub] = useState(false);
  const [showSitrep, setShowSitrep] = useState(false);
  const [sitrepText, setSitrepText] = useState('');

  // Undo buffer states
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
    volunteers, zoneNeeds, dispatchMessages,
    selectedVolunteer, setSelectedVolunteer,
    dispatchVolunteer, recallVolunteer,
    roleIcons, roleColors, zoneConfigs,
  } = useVolunteerSim();

  useEffect(() => {
    if (!socket) return;
    socket.on('zone:enter', (alert: GeofenceAlert) => {
      startTransition(() => {
        setAlerts((prev) => [alert, ...prev].slice(0, 20));
      });
      triggerHaptic('warning');
    });
    return () => { socket.off('zone:enter'); };
  }, [socket, triggerHaptic]);

  // Fetch FEMA SITREP report when modal opens
  useEffect(() => {
    if (showSitrep) {
      setSitrepText('Loading FEMA ICS briefing...');
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
      fetch(`${API_URL}/api/v1/ai/sitrep`)
        .then((res) => res.text())
        .then((text) => setSitrepText(text))
        .catch((err) => {
          console.error(err);
          setSitrepText('Failed to generate Situation Briefing Report.');
        });
    }
  }, [showSitrep]);

  // Handle slide gesture for SOS trigger
  useEffect(() => {
    let interval: any;
    if (sosProgress >= 100) {
      setSosTriggered(true);
      setShowSosSlider(false);
      triggerHaptic('sos');
      // Auto reset after 5 seconds
      setTimeout(() => {
        setSosTriggered(false);
        setSosProgress(0);
      }, 5000);
    } else if (sosProgress > 0 && !sosTriggered) {
      interval = setInterval(() => {
        setSosProgress((p) => Math.max(0, p - 5));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [sosProgress, sosTriggered, triggerHaptic]);

  // Handle the 5-second Undo countdown
  useEffect(() => {
    if (pendingAction) {
      setUndoTimeLeft(5);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      
      countdownTimerRef.current = setInterval(() => {
        setUndoTimeLeft((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            // Execute action
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
    const vol = volunteers.find(v => v.id === volunteerId);
    const zone = zoneConfigs.find(z => z.zoneId === zoneId);
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
    const vol = volunteers.find(v => v.id === volunteerId);
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

    if (command.includes('toggle contrast') || command.includes('toggle theme') || command.includes('high contrast') || command.includes('tactical mode')) {
      toggleTheme();
      setVoiceFeedback('Toggled high contrast display mode.');
      return;
    }

    if (command.includes('dispatch') || command.includes('send')) {
      const matchingVol = volunteers.find(v => command.includes(v.name.split(' ')[0].toLowerCase()));
      const matchingZone = zoneConfigs.find(z => {
        const zoneWord = z.zoneName.toLowerCase();
        if (zoneWord.includes('alpha') || zoneWord.includes('la')) return command.includes('la') || command.includes('alpha') || command.includes('wildfire');
        if (zoneWord.includes('beta') || zoneWord.includes('chicago')) return command.includes('chicago') || command.includes('beta') || command.includes('flood');
        if (zoneWord.includes('c') || zoneWord.includes('nyc')) return command.includes('nyc') || command.includes('c') || command.includes('evacuation');
        return false;
      });

      if (matchingVol && matchingZone) {
        handleDispatchClick(matchingVol.id, matchingZone.zoneId);
        setVoiceFeedback(`Command buffered: Send ${matchingVol.name} to ${matchingZone.zoneName}.`);
        return;
      }
    }

    if (command.includes('recall') || command.includes('return')) {
      const matchingVol = volunteers.find(v => command.includes(v.name.split(' ')[0].toLowerCase()));
      if (matchingVol) {
        handleRecallClick(matchingVol.id);
        setVoiceFeedback(`Command buffered: Recall ${matchingVol.name}.`);
        return;
      }
    }

    setVoiceFeedback("Command not recognized. Try saying 'dispatch Sarah to LA' or 'toggle contrast'.");
    triggerHaptic('warning');
  };

  const isContrast = themeMode === 'contrast';
  const isRtl = lang === 'ar';

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        background: styles.appBg, 
        color: styles.textColor, 
        fontFamily: styles.fontFamily, 
        fontSize: styles.fontSize,
        overflow: 'hidden' 
      }}
    >
      <CommandHeader 
        connected={connected} 
        peerCount={peerCount} 
        syncStatus={syncStatus} 
        alertCount={alerts.length} 
        onShowSitrep={() => setShowSitrep(true)}
        onShowTacticalHub={() => setShowTacticalHub(true)}
      />
      <StatsBar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, flexDirection: 'row' }}>
        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <GeospatialDashboard
            socket={socket}
            volunteers={volunteers}
            selectedVolunteerId={selectedVolunteer?.id ?? null}
            onSelectVolunteer={(v) => setSelectedVolunteer(v)}
            roleIcons={roleIcons}
            roleColors={roleColors}
          />

          {/* Voice interface floating bar */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: isRtl ? 'auto' : 20,
            right: isRtl ? 20 : 'auto',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <button
              onClick={toggleVoiceListening}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: isListening ? '#ef4444' : (isContrast ? '#000000' : 'rgba(15, 23, 42, 0.95)'),
                color: isListening ? '#ffffff' : (isContrast ? '#00ff00' : '#38bdf8'),
                border: `2px solid ${isListening ? '#ffffff' : styles.borderColor}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isContrast ? 'none' : '0 4px 12px rgba(0,0,0,0.5)',
                outline: 'none',
              }}
              title="Voice Commands"
            >
              <span style={{ fontSize: 20 }}>{isListening ? '🎙' : '🎤'}</span>
            </button>

            {/* Voice feedback overlay */}
            <AnimatePresence>
              {(isListening || voiceFeedback) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: isRtl ? 10 : -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: styles.panelBackdrop,
                    border: `1px solid ${styles.borderColor}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    maxWidth: 240,
                    boxShadow: isContrast ? 'none' : '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isListening ? 'Listening...' : 'Voice Feedback'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: isContrast ? '#00ff00' : '#f1f5f9', marginTop: 2 }}>
                    {isListening ? (voiceTranscript || 'Speak now...') : voiceFeedback}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating alert toasts */}
          <div style={{ 
            position: 'absolute', 
            top: 12, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1000, 
            width: 'calc(100% - 24px)',
            maxWidth: '460px', 
            pointerEvents: 'none' 
          }}>
            <AnimatePresence>
              {alerts.slice(0, 3).map((alert, i) => (
                <motion.div
                  key={`${alert.zoneId}-${alert.timestamp}`}
                  initial={{ opacity: 0, y: -30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    marginBottom: 8, padding: '10px 16px', borderRadius: 8,
                    background: isContrast
                      ? '#000000'
                      : (alert.type === 'enter' ? 'rgba(220,38,38,0.92)' : 'rgba(217,119,6,0.92)'),
                    backdropFilter: styles.panelBackdrop,
                    border: `${styles.borderWidth} solid ${
                      isContrast
                        ? '#ff3333'
                        : (alert.type === 'enter' ? '#f87171' : '#fbbf24')
                    }`,
                    display: 'flex', alignItems: 'center', gap: 10,
                    pointerEvents: 'all', 
                    boxShadow: isContrast ? '0 0 10px #ff3333' : '0 4px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{alert.type === 'enter' ? '🚨' : '✅'}</span>
                  <div style={{ flex: 1, textAlign: isRtl ? 'right' : 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isContrast ? '#ff3333' : '#ffffff' }}>
                      {alert.type === 'enter' ? t('breach') : t('cleared')}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>
                      {t('vol')}: <strong>{alert.responderId.slice(0, 8)}</strong> {alert.type === 'enter' ? 'entered' : 'exited'} <strong>{alert.zoneName}</strong>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setAlerts(p => p.filter((_, idx) => idx !== i));
                      triggerHaptic('tap');
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: isContrast ? '#ff3333' : 'white', 
                      cursor: 'pointer', 
                      fontSize: 16, 
                      opacity: 0.7, 
                      pointerEvents: 'all',
                      outline: 'none',
                    }}
                  >✕</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Zone need overlays on map */}
          <div style={{ 
            position: 'absolute', 
            bottom: 80, 
            left: isRtl ? 'auto' : 12, 
            right: isRtl ? 12 : 'auto', 
            zIndex: 1000, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 6 
          }}>
            <AnimatePresence>
              {zoneNeeds.filter(n => n.status === 'critical-need' || n.status === 'needs-support').map(need => (
                <motion.div
                  key={need.zoneId}
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  style={{
                    background: isContrast 
                      ? '#000000' 
                      : (need.status === 'critical-need' ? 'rgba(69,10,10,0.95)' : 'rgba(67,20,7,0.95)'),
                    border: `${styles.borderWidth} solid ${
                      isContrast
                        ? '#ff3333'
                        : (need.status === 'critical-need' ? '#f87171' : '#fb923c')
                    }`,
                    borderRadius: 8, padding: '8px 12px', backdropFilter: styles.panelBackdrop,
                    boxShadow: isContrast ? 'none' : '0 4px 16px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 800, 
                    color: isContrast 
                      ? '#ff3333' 
                      : (need.status === 'critical-need' ? '#fca5a5' : '#fdba74') 
                  }}>
                    {need.status === 'critical-need' ? '🆘 URGENT HELP NEEDED' : '⚠ SUPPORT NEEDED'}
                  </div>
                  <div style={{ fontSize: 10, color: isContrast ? '#ff3333' : '#94a3b8', opacity: isContrast ? 0.7 : 1, marginTop: 2 }}>
                    {need.zoneName} — {need.currentCount}/{need.requiredCount} {t('responders')}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Persistent Floating SOS Button */}
          <div style={{ position: 'absolute', bottom: 20, right: isRtl ? 'auto' : 80, left: isRtl ? 80 : 'auto', zIndex: 1050 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setShowSosSlider(!showSosSlider);
                triggerHaptic('tap');
              }}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: isContrast ? '#000000' : '#dc2626',
                color: isContrast ? '#ff3333' : '#ffffff',
                border: `3px solid ${isContrast ? '#ff3333' : '#ffffff'}`,
                fontWeight: 900,
                fontSize: 14,
                boxShadow: isContrast ? '0 0 15px #ff3333' : '0 4px 20px rgba(220,38,38,0.5)',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              SOS
            </motion.button>
          </div>

          {/* Slide-to-SOS Swipe/Gesture Panel */}
          <AnimatePresence>
            {showSosSlider && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                style={{
                  position: 'absolute',
                  bottom: 90,
                  right: isRtl ? 'auto' : 80,
                  left: isRtl ? 80 : 'auto',
                  width: 280,
                  background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: styles.panelBackdrop,
                  border: `${styles.borderWidth} solid ${isContrast ? '#ff3333' : '#1e3a5f'}`,
                  borderRadius: 12,
                  padding: 16,
                  zIndex: 1050,
                  boxShadow: isContrast ? 'none' : '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: isContrast ? '#ff3333' : '#f87171' }}>
                  {t('sos')}
                </div>
                <div 
                  style={{
                    height: 40,
                    background: '#111827',
                    borderRadius: 20,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${isContrast ? '#ff3333' : '#334155'}`,
                  }}
                >
                  <span style={{ fontSize: 10, color: '#4b5563', userSelect: 'none', pointerEvents: 'none' }}>
                    SLIDE RIGHT TO TRIGGER
                  </span>
                  
                  {/* Slider Handler */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 200 }}
                    dragElastic={0}
                    onDrag={(_, info) => {
                      const computed = Math.min(100, Math.max(0, (info.offset.x / 200) * 100));
                      setSosProgress(computed);
                      triggerHaptic('tap');
                    }}
                    onDragEnd={() => {
                      if (sosProgress < 100) setSosProgress(0);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isContrast ? '#ff3333' : '#dc2626',
                      position: 'absolute',
                      left: 2,
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    →
                  </motion.div>

                  {/* Fill progress */}
                  <div 
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${sosProgress}%`,
                      background: isContrast ? 'rgba(255,51,51,0.2)' : 'rgba(220,38,38,0.2)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SOS Confirmation Dialog */}
          <AnimatePresence>
            {sosTriggered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.85)',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ fontSize: 64, marginBottom: 16 }}
                >
                  🚨
                </motion.div>
                <h1 style={{ color: '#ff3333', fontSize: 28, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>
                  BROADCASTING SOS
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
                  Emergency GPS beacon active. High-priority dispatch requests broadcast to all mesh peers and server coordinators.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side drawer / Panel */}
        <div style={{ 
          width: 360, 
          display: 'flex', 
          flexDirection: 'column', 
          borderLeft: `${styles.borderWidth} solid ${styles.borderColor}`, 
          background: styles.panelBg,
          backdropFilter: styles.panelBackdrop,
          flexShrink: 0,
          boxShadow: isContrast ? 'none' : styles.glowShadow,
        }}>
          {/* 5-Second Undo Toast Notification Overlay */}
          <AnimatePresence>
            {pendingAction && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  margin: 8,
                  padding: '10px 14px',
                  background: isContrast ? '#000000' : 'rgba(239, 68, 68, 0.95)',
                  border: `2px solid ${isContrast ? '#ff3333' : '#ef4444'}`,
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: isContrast ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: isContrast ? '#ff3333' : '#ffffff' }}>
                    {pendingAction.message}
                  </span>
                  <span style={{ fontSize: 9, color: isContrast ? '#ff3333' : '#fca5a5', opacity: 0.8 }}>
                    Executing in {undoTimeLeft}s...
                  </span>
                </div>
                <button
                  onClick={handleUndo}
                  style={{
                    background: isContrast ? '#00ff00' : '#ffffff',
                    color: '#000000',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 10,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  UNDO
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thumb-reachable Tabs */}
          <div style={{ display: 'flex', borderBottom: `${styles.borderWidth} solid ${styles.borderColor}`, flexShrink: 0 }}>
            {(['volunteers', 'resources', 'alerts', 'mesh', 'comms', 'ingestion'] as const).map((tab) => (
              <button 
                key={tab} 
                onClick={() => {
                  setActivePanel(tab);
                  triggerHaptic('tap');
                }} 
                style={{
                  flex: 1, 
                  padding: '12px 2px', 
                  fontSize: 10, 
                  fontWeight: 800,
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em', 
                  cursor: 'pointer',
                  background: activePanel === tab ? (isContrast ? '#00ff00' : '#0f2040') : 'transparent',
                  color: activePanel === tab 
                    ? (isContrast ? '#000000' : '#38bdf8') 
                    : (isContrast ? '#00ff00' : '#64748b'),
                  border: 'none', 
                  borderBottom: activePanel === tab ? `3px solid ${isContrast ? '#00ff00' : '#38bdf8'}` : '3px solid transparent',
                  fontFamily: styles.fontFamily,
                  outline: 'none',
                }}
              >
                {tab === 'alerts' && alerts.length > 0 ? `${t('alerts')} (${alerts.length})` : t(tab)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {activePanel === 'volunteers' && (
              <VolunteerPanel
                volunteers={volunteers}
                zoneNeeds={zoneNeeds}
                dispatchMessages={dispatchMessages}
                selectedVolunteer={selectedVolunteer}
                onSelect={setSelectedVolunteer}
                onDispatch={handleDispatchClick}
                onRecall={handleRecallClick}
                roleIcons={roleIcons}
                roleColors={roleColors}
                zoneConfigs={zoneConfigs}
              />
            )}
            {activePanel === 'resources' && <ResourcePanel socket={socket} />}
            {activePanel === 'alerts' && <AlertFeed alerts={alerts} onDismiss={(i) => setAlerts(p => p.filter((_, idx) => idx !== i))} />}
            {activePanel === 'mesh' && <MeshTopology connected={connected} peerCount={peerCount} />}
            {activePanel === 'comms' && <CommsPanel socket={socket} volunteers={volunteers} token={token} />}
            {activePanel === 'ingestion' && <BulkIngestionStudio />}
          </div>
        </div>
      </div>

      {/* FEMA SITREP Report Modal */}
      <AnimatePresence>
        {showSitrep && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%', maxWidth: '650px', maxHeight: '80%',
                background: isContrast ? '#000000' : 'rgba(15, 23, 42, 0.98)',
                backdropFilter: styles.panelBackdrop,
                border: `2px solid ${styles.borderColor}`,
                borderRadius: 12, padding: 20,
                display: 'flex', flexDirection: 'column',
                boxShadow: isContrast ? 'none' : '0 12px 40px rgba(0,0,0,0.6)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12, color: isContrast ? '#00ff00' : '#e2e8f0', textTransform: 'uppercase' }}>
                📋 FEMA ICS Incident Situation Report
              </h2>
              
              <div style={{ 
                flex: 1, overflowY: 'auto', background: '#020617', border: `1px solid ${styles.borderColor}`,
                borderRadius: 6, padding: 14, marginBottom: 16, fontSize: 11, fontFamily: 'monospace',
                whiteSpace: 'pre-wrap', color: isContrast ? '#00ff00' : '#94a3b8', lineHeight: 1.5,
                textAlign: 'left',
              }}>
                {sitrepText}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sitrepText);
                    triggerHaptic('success');
                    alert('SITREP copied to clipboard.');
                  }}
                  style={{
                    flex: 1, background: isContrast ? 'transparent' : '#2563eb',
                    color: isContrast ? '#00ff00' : '#ffffff',
                    border: `1px solid ${isContrast ? '#00ff00' : '#2563eb'}`,
                    padding: '8px 16px', borderRadius: 6, fontWeight: 'bold', fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Copy Report
                </button>
                <button
                  onClick={() => setShowSitrep(false)}
                  style={{
                    flex: 1, background: 'transparent',
                    color: isContrast ? '#ff3333' : '#94a3b8',
                    border: `1px solid ${isContrast ? '#ff3333' : '#334155'}`,
                    padding: '8px 16px', borderRadius: 6, fontWeight: 'bold', fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tactical Interoperability & Command Hub Modal */}
      <TacticalHub 
        theme={appTheme} 
        isOpen={showTacticalHub} 
        onClose={() => setShowTacticalHub(false)} 
      />
    </div>
  );
}
