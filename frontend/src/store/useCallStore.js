import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useCallStore = create((set, get) => ({
  // Call state
  currentCall: null,
  incomingCall: null,
  isCallActive: false,
  isIncomingCall: false,
  callHistory: [],
  
  // Media state
  localStream: null,
  remoteStreams: {},
  peerConnections: {},
  isVideoEnabled: true,
  isAudioEnabled: true,
  
  // Loading states
  isInitiatingCall: false,
  isLoadingHistory: false,

  // ICE candidate buffering
  iceCandidateBuffers: {},

  // WebRTC Configuration - Enhanced with more STUN/TURN servers
  rtcConfig: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      // Multiple TURN servers for better connectivity
      { 
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject", 
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  },

  initiateCall: async (callData) => {
    set({ isInitiatingCall: true });
    try {
      const res = await axiosInstance.post("/calls/initiate", callData);
      const call = res.data;
      
      set({ currentCall: call, isCallActive: true });
      
      // Start local media first
      await get().startLocalMedia(callData.callType);
      
      // Don't make offer immediately for caller - wait for answerer to be ready
      
      return call;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to initiate call");
      throw error;
    } finally {
      set({ isInitiatingCall: false });
    }
  },

  answerCall: async (callId, answer = true) => {
    try {
      const res = await axiosInstance.post(`/calls/${callId}/answer`, { answer });
      
      if (answer) {
        const call = get().incomingCall || res.data;
        
        set({ 
          currentCall: call, 
          isCallActive: true, 
          incomingCall: null, 
          isIncomingCall: false 
        });
        
        // Start local media for answered call
        await get().startLocalMedia(call.callType);
        
        // Small delay then signal readiness
        setTimeout(() => {
          const socket = useAuthStore.getState().socket;
          socket.emit("call-ready", callId);
        }, 1000);
        
      } else {
        set({ incomingCall: null, isIncomingCall: false });
      }
      
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to answer call");
      throw error;
    }
  },

  endCall: async (callId) => {
    try {
      await axiosInstance.post(`/calls/${callId}/end`);
      get().cleanup();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to end call");
    }
  },

  startLocalMedia: async (callType) => {
    try {
      
      const constraints = {
        video: callType === 'video' ? {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      };
      
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      set({ 
        localStream: stream,
        isVideoEnabled: callType === 'video',
        isAudioEnabled: true
      });
      
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Failed to access camera/microphone: " + error.message);
      throw error;
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        set({ isVideoEnabled: !isVideoEnabled });
      }
    }
  },

  toggleAudio: () => {
    const { localStream, isAudioEnabled } = get();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        set({ isAudioEnabled: !isAudioEnabled });
      }
    }
  },

  createPeerConnection: (userId) => {
    const { rtcConfig, localStream } = get();
    
    const pc = new RTCPeerConnection(rtcConfig);
    
    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track, index) => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      
      const remoteStream = event.streams[0];
      
      if (remoteStream) {
        set((state) => ({
          remoteStreams: {
            ...state.remoteStreams,
            [userId]: remoteStream
          }
        }));
      }
    };
    
    // Handle ICE candidates
    const socket = useAuthStore.getState().socket;
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const { currentCall } = get();
        socket.emit("ice-candidate", event.candidate, userId, currentCall.callId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      } else if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      } else if (pc.iceConnectionState === 'disconnected') {
        // Give it some time to reconnect before restarting
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            pc.restartIce();
          }
        }, 5000);
      }
    };
    
    set((state) => ({
      peerConnections: {
        ...state.peerConnections,
        [userId]: pc
      }
    }));
    
    return pc;
  },

  handleOffer: async (offer, senderId, callId) => {
    try {
      
      const { localStream } = get();
      if (!localStream) {
        console.error("❌ No local stream available when handling offer");
        return;
      }
      
      const pc = get().createPeerConnection(senderId);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(answer);
      
      const socket = useAuthStore.getState().socket;
      socket.emit("answer", answer, senderId, callId);
      
    } catch (error) {
      console.error("❌ Error handling offer:", error);
    }
  },

  handleAnswer: async (answer, senderId) => {
    try {
      const { peerConnections } = get();
      const pc = peerConnections[senderId];
      
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } else {
        console.warn("Cannot set remote description - invalid state:", pc?.signalingState);
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  },

  handleIceCandidate: async (candidate, senderId) => {
    try {
      const { peerConnections, iceCandidateBuffers } = get();
      const pc = peerConnections[senderId];
      
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        
        // Process any buffered candidates
        if (iceCandidateBuffers[senderId] && iceCandidateBuffers[senderId].length > 0) {
          for (const bufferedCandidate of iceCandidateBuffers[senderId]) {
            await pc.addIceCandidate(new RTCIceCandidate(bufferedCandidate));
          }
          // Clear buffer
          set(state => ({
            iceCandidateBuffers: {
              ...state.iceCandidateBuffers,
              [senderId]: []
            }
          }));
        }
      } else {
        console.warn("Buffering ICE candidate - no remote description yet");
        // Buffer the candidate
        set(state => ({
          iceCandidateBuffers: {
            ...state.iceCandidateBuffers,
            [senderId]: [...(state.iceCandidateBuffers[senderId] || []), candidate]
          }
        }));
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  },

  makeOffer: async (targetUserId) => {
    try {
      
      const { localStream } = get();
      if (!localStream) {
        console.error("❌ No local stream available when making offer");
        return;
      }
      
      const pc = get().createPeerConnection(targetUserId);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      const socket = useAuthStore.getState().socket;
      const { currentCall } = get();
      socket.emit("offer", offer, targetUserId, currentCall.callId);
      
    } catch (error) {
      console.error("❌ Error making offer:", error);
    }
  },

  startCall: () => {
    const { currentCall } = get();
    const authUser = useAuthStore.getState().authUser;
    
    if (currentCall && currentCall.chatType === 'direct') {
      const otherParticipant = currentCall.participants.find(
        p => p.userId._id !== authUser._id
      );
      
      if (otherParticipant) {
        get().makeOffer(otherParticipant.userId._id);
      }
    }
  },

  cleanup: () => {
    const { localStream, peerConnections } = get();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Close peer connections
    Object.entries(peerConnections).forEach(([userId, pc]) => {
      pc.close();
    });
    
    set({
      currentCall: null,
      incomingCall: null,
      isCallActive: false,
      isIncomingCall: false,
      localStream: null,
      remoteStreams: {},
      peerConnections: {},
      iceCandidateBuffers: {},
      isVideoEnabled: true,
      isAudioEnabled: true
    });
  },

  setIncomingCall: (call) => {
    set({ incomingCall: call, isIncomingCall: true });
  },

  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    
    socket.on("incoming-call", (call) => {
      get().setIncomingCall(call);
    });
    
    socket.on("call-ready", (callId) => {
      get().startCall();
    });
    
    socket.on("call-ended", ({ callId, userId }) => {
      get().cleanup();
    });
    
    socket.on("offer", (offer, senderId, callId) => {
      get().handleOffer(offer, senderId, callId);
    });
    
    socket.on("answer", (answer, senderId, callId) => {
      get().handleAnswer(answer, senderId);
    });
    
    socket.on("ice-candidate", (candidate, senderId, callId) => {
      get().handleIceCandidate(candidate, senderId);
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("incoming-call");
    socket.off("call-answered");
    socket.off("call-ready");
    socket.off("call-ended");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
  }
}));