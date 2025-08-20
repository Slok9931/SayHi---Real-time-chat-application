import { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Minimize2,
  Maximize2
} from "lucide-react";

const CallInterface = () => {
  const {
    currentCall,
    isCallActive,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    endCall,
    makeOffer
  } = useCallStore();
  
  const { authUser } = useAuthStore();
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const [isMinimized, setIsMinimized] = useState(false);

  // Set up local video
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      console.log("Local stream set:", localStream);
    }
  }, [localStream]);

  // Set up remote videos with better error handling
  useEffect(() => {
    console.log("Remote streams updated:", remoteStreams);
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (remoteVideoRefs.current[userId] && stream) {
        remoteVideoRefs.current[userId].srcObject = stream;
        console.log(`Remote stream set for user ${userId}:`, stream);
        
        // Force video to play
        const videoElement = remoteVideoRefs.current[userId];
        videoElement.play().catch(e => console.log("Video play error:", e));
      }
    });
  }, [remoteStreams]);

  // Initialize WebRTC when call becomes active
  useEffect(() => {
    if (isCallActive && currentCall && localStream) {
      console.log("Initializing WebRTC for call:", currentCall);
      
      // Small delay to ensure streams are ready
      setTimeout(() => {
        if (currentCall.chatType === 'direct') {
          const otherParticipant = currentCall.participants.find(
            p => p.userId._id !== authUser._id
          );
          if (otherParticipant && currentCall.caller._id === authUser._id) {
            console.log("Making offer to:", otherParticipant.userId._id);
            makeOffer(otherParticipant.userId._id);
          }
        } else {
          const otherParticipants = currentCall.participants.filter(
            p => p.userId._id !== authUser._id && p.status === 'joined'
          );
          otherParticipants.forEach(participant => {
            if (currentCall.caller._id === authUser._id) {
              console.log("Making group offer to:", participant.userId._id);
              makeOffer(participant.userId._id);
            }
          });
        }
      }, 1000);
    }
  }, [isCallActive, currentCall, localStream, authUser._id, makeOffer]);

  if (!isCallActive || !currentCall) return null;

  const handleEndCall = () => {
    endCall(currentCall.callId);
  };

  const getCallTitle = () => {
    if (currentCall.chatType === 'group') {
      return currentCall.groupId?.name || 'Group Call';
    } else {
      const otherParticipant = currentCall.participants.find(
        p => p.userId._id !== authUser._id
      );
      return otherParticipant?.userId.fullName || 'Direct Call';
    }
  };

  const activeParticipants = currentCall.participants.filter(
    p => p.status === 'joined'
  );

  const remoteStreamEntries = Object.entries(remoteStreams);
  const hasRemoteVideo = remoteStreamEntries.length > 0;

  return (
    <div className={`fixed inset-0 bg-black z-50 flex flex-col ${isMinimized ? 'bottom-4 right-4 w-80 h-60' : ''}`}>
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between text-white">
        <div>
          <h2 className="text-lg font-semibold">{getCallTitle()}</h2>
          <p className="text-sm text-gray-300">
            {currentCall.callType === 'video' ? 'Video Call' : 'Voice Call'} • 
            {activeParticipants.length} participant{activeParticipants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-gray-700 rounded-full"
          >
            {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-gray-900">
        {currentCall.callType === 'video' ? (
          <div className="h-full">
            {currentCall.chatType === 'group' ? (
              // Group video layout
              <div className="grid grid-cols-2 gap-2 h-full p-4">
                {/* Local video */}
                <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    You {!isVideoEnabled && "(Video Off)"}
                  </div>
                </div>
                
                {/* Remote videos */}
                {remoteStreamEntries.map(([userId, stream]) => {
                  const participant = currentCall.participants.find(p => p.userId._id === userId);
                  return (
                    <div key={userId} className="relative bg-gray-800 rounded-lg overflow-hidden">
                      <video
                        ref={el => {
                          if (el) {
                            remoteVideoRefs.current[userId] = el;
                            if (stream) {
                              el.srcObject = stream;
                              el.play().catch(e => console.log("Video play error:", e));
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                        {participant?.userId.fullName || 'Unknown'}
                      </div>
                    </div>
                  );
                })}
                
                {/* Placeholder for empty slots */}
                {remoteStreamEntries.length === 0 && (
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="text-white text-center">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Waiting for participants...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Direct video layout
              <div className="relative h-full">
                {/* Remote video (main) */}
                {hasRemoteVideo ? (
                  remoteStreamEntries.map(([userId, stream]) => {
                    const participant = currentCall.participants.find(p => p.userId._id === userId);
                    return (
                      <div key={userId} className="absolute inset-0">
                        <video
                          ref={el => {
                            if (el) {
                              remoteVideoRefs.current[userId] = el;
                              if (stream) {
                                el.srcObject = stream;
                                el.play().catch(e => console.log("Video play error:", e));
                              }
                            }
                          }}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                          {participant?.userId.fullName || 'Remote User'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Placeholder when no remote video
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-white text-center">
                      <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Connecting...</p>
                      <p className="text-sm opacity-75">Waiting for {getCallTitle()}</p>
                    </div>
                  </div>
                )}
                
                {/* Local video (picture-in-picture) */}
                <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-600 flex items-center justify-center">
                      <VideoOff className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Voice call layout
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Phone className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold">{getCallTitle()}</h3>
              <p className="text-gray-300">Voice Call Active</p>
              {!isAudioEnabled && (
                <p className="text-red-400 text-sm mt-2">Microphone muted</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex items-center justify-center gap-4">
        {currentCall.callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>
        )}
        
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioEnabled 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6 text-white" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>
        
        <button
          onClick={handleEndCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default CallInterface;