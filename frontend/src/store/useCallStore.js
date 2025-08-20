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

  // WebRTC Configuration
  rtcConfig: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]
  },

  initiateCall: async (callData) => {
    set({ isInitiatingCall: true });
    try {
      const res = await axiosInstance.post("/calls/initiate", callData);
      set({ currentCall: res.data, isCallActive: true });
      
      // Start local media
      await get().startLocalMedia(callData.callType);
      
      return res.data;
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
        video: callType === 'video',
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      set({ localStream: stream });
      
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Failed to access camera/microphone");
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
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      const remoteStream = event.streams[0];
      set((state) => ({
        remoteStreams: {
          ...state.remoteStreams,
          [userId]: remoteStream
        }
      }));
    };
    
    // Handle ICE candidates
    const socket = useAuthStore.getState().socket;
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        const { currentCall } = get();
        if (currentCall?.chatType === 'direct') {
          socket.emit("ice-candidate", event.candidate, userId, currentCall.callId);
        } else if (currentCall?.chatType === 'group') {
          const targetUserIds = currentCall?.participants
            ?.map(p => p.userId._id || p.userId)
            ?.filter(id => id !== useAuthStore.getState().authUser._id) || [];
          if (targetUserIds.length > 0) {
            socket.emit("group-ice-candidate", event.candidate, targetUserIds, currentCall.callId);
          }
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
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
      console.log("Handling offer from:", senderId);
      const pc = get().createPeerConnection(senderId);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const socket = useAuthStore.getState().socket;
      const { currentCall } = get();
      
      if (currentCall?.chatType === 'direct') {
        socket.emit("answer", answer, senderId, callId);
      } else if (currentCall?.chatType === 'group') {
        const targetUserIds = currentCall?.participants
          ?.map(p => p.userId._id || p.userId)
          ?.filter(id => id !== useAuthStore.getState().authUser._id) || [];
        if (targetUserIds.length > 0) {
          socket.emit("group-answer", answer, targetUserIds, callId);
        }
      }
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  },

  handleAnswer: async (answer, senderId) => {
    try {
      console.log("Handling answer from:", senderId);
      const { peerConnections } = get();
      const pc = peerConnections[senderId];
      
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  },

  handleIceCandidate: async (candidate, senderId) => {
    try {
      console.log("Handling ICE candidate from:", senderId);
      const { peerConnections } = get();
      const pc = peerConnections[senderId];
      
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  },

  makeOffer: async (targetUserId) => {
    try {
      console.log("Making offer to:", targetUserId);
      const pc = get().createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const socket = useAuthStore.getState().socket;
      const { currentCall } = get();
      
      if (currentCall?.chatType === 'direct') {
        socket.emit("offer", offer, targetUserId, currentCall.callId);
      } else if (currentCall?.chatType === 'group') {
        const targetUserIds = currentCall?.participants
          ?.map(p => p.userId._id || p.userId)
          ?.filter(id => id !== useAuthStore.getState().authUser._id) || [];
        if (targetUserIds.length > 0) {
          socket.emit("group-offer", offer, targetUserIds, currentCall.callId);
        }
      }
    } catch (error) {
      console.error("Error making offer:", error);
    }
  },

  cleanup: () => {
    const { localStream, peerConnections } = get();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connections
    Object.values(peerConnections).forEach(pc => pc.close());
    
    set({
      currentCall: null,
      incomingCall: null,
      isCallActive: false,
      isIncomingCall: false,
      localStream: null,
      remoteStreams: {},
      peerConnections: {},
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
      console.log("Incoming call:", call);
      get().setIncomingCall(call);
    });
    
    socket.on("call-answered", ({ answer, userId, callId }) => {
      console.log("Call answered:", { answer, userId, callId });
    });
    
    socket.on("call-ended", ({ callId, userId }) => {
      console.log("Call ended:", { callId, userId });
      get().cleanup();
    });
    
    socket.on("offer", (offer, senderId, callId) => {
      console.log("Received offer:", { senderId, callId });
      get().handleOffer(offer, senderId, callId);
    });
    
    socket.on("answer", (answer, senderId, callId) => {
      console.log("Received answer:", { senderId, callId });
      get().handleAnswer(answer, senderId);
    });
    
    socket.on("ice-candidate", (candidate, senderId, callId) => {
      console.log("Received ICE candidate:", { senderId, callId });
      get().handleIceCandidate(candidate, senderId);
    });
    
    socket.on("group-offer", (offer, senderId, callId) => {
      console.log("Received group offer:", { senderId, callId });
      get().handleOffer(offer, senderId, callId);
    });
    
    socket.on("group-answer", (answer, senderId, callId) => {
      console.log("Received group answer:", { senderId, callId });
      get().handleAnswer(answer, senderId);
    });
    
    socket.on("group-ice-candidate", (candidate, senderId, callId) => {
      console.log("Received group ICE candidate:", { senderId, callId });
      get().handleIceCandidate(candidate, senderId);
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("incoming-call");
    socket.off("call-answered");
    socket.off("call-ended");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("group-offer");
    socket.off("group-answer");
    socket.off("group-ice-candidate");
  }
}));