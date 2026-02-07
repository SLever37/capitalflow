
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CallState } from '../types/supportChat.types';

const RTC_CONFIG = {
    iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }]
};

export const useWebRTCCall = (loanId: string, userId: string) => {
    const [callState, setCallState] = useState<CallState>({ status: 'IDLE', type: 'VIDEO', roomId: '' });
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    
    // Signaling Channel
    const channel = supabase.channel(`call-signaling-${loanId}`);

    const cleanup = useCallback(() => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setRemoteStream(null);
        setCallState(prev => ({ ...prev, status: 'IDLE' }));
    }, []);

    const setupPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                channel.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: event.candidate, from: userId } });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                pc.addTrack(track, localStream.current!);
            });
        }

        peerConnection.current = pc;
        return pc;
    }, [channel, userId]);

    // --- ACTIONS ---

    const startCall = async (type: 'AUDIO' | 'VIDEO') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'VIDEO', audio: true });
            localStream.current = stream;
            
            const pc = setupPeerConnection();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            setCallState({ status: 'CALLING', type, roomId: loanId });
            
            // Envia sinal de oferta
            channel.send({ 
                type: 'broadcast', 
                event: 'offer', 
                payload: { sdp: offer, type, from: userId } 
            });

        } catch (e) {
            console.error("Erro ao iniciar chamada:", e);
            cleanup();
        }
    };

    const answerCall = async () => {
        if (callState.status !== 'RINGING') return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: callState.type === 'VIDEO', audio: true });
            localStream.current = stream;

            const pc = peerConnection.current || setupPeerConnection(); // Should exist from offer handling
            
            // Re-add tracks if late
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setCallState(prev => ({ ...prev, status: 'IN_CALL' }));

            channel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { sdp: answer, from: userId }
            });

        } catch (e) {
            console.error(e);
            endCall();
        }
    };

    const endCall = () => {
        channel.send({ type: 'broadcast', event: 'end-call', payload: { from: userId } });
        cleanup();
    };

    // --- SIGNALING LISTENERS ---

    useEffect(() => {
        channel
            .on('broadcast', { event: 'offer' }, async ({ payload }) => {
                if (payload.from === userId) return; // Ignore self
                
                // Recebeu oferta (Incoming Call)
                setCallState({ status: 'RINGING', type: payload.type, roomId: loanId });
                
                const pc = setupPeerConnection();
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            })
            .on('broadcast', { event: 'answer' }, async ({ payload }) => {
                if (payload.from === userId) return;
                
                // Recebeu resposta (Call Accepted)
                if (peerConnection.current) {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    setCallState(prev => ({ ...prev, status: 'IN_CALL' }));
                }
            })
            .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                if (payload.from === userId) return;
                if (peerConnection.current) {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                }
            })
            .on('broadcast', { event: 'end-call' }, () => {
                cleanup();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
            cleanup();
        };
    }, [loanId, userId, cleanup, setupPeerConnection]);

    return {
        callState,
        localStream: localStream.current,
        remoteStream,
        startCall,
        answerCall,
        endCall
    };
};
