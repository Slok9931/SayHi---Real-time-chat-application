import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video, Users } from "lucide-react";

const IncomingCall = () => {
  const { incomingCall, isIncomingCall, answerCall } = useCallStore();

  if (!isIncomingCall || !incomingCall) return null;

  const handleAnswer = () => {
    answerCall(incomingCall.callId, true);
  };

  const handleDecline = () => {
    answerCall(incomingCall.callId, false);
  };

  const getCallerInfo = () => {
    if (incomingCall.chatType === 'group') {
      return {
        name: incomingCall.groupId?.name || 'Group Call',
        avatar: incomingCall.groupId?.groupImage,
        subtitle: `${incomingCall.caller.fullName} is calling`
      };
    } else {
      return {
        name: incomingCall.caller.fullName,
        avatar: incomingCall.caller.profilePic,
        subtitle: 'Incoming call'
      };
    }
  };

  const callerInfo = getCallerInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Avatar */}
        <div className="mb-6">
          {callerInfo.avatar ? (
            <img
              src={callerInfo.avatar}
              alt={callerInfo.name}
              className="w-24 h-24 rounded-full mx-auto object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-primary/10 flex items-center justify-center">
              {incomingCall.chatType === 'group' ? (
                <Users className="w-12 h-12 text-primary" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-300" />
              )}
            </div>
          )}
        </div>

        {/* Call Info */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {callerInfo.name}
          </h2>
          <p className="text-gray-600 mb-2">{callerInfo.subtitle}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            {incomingCall.callType === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                <span>Video Call</span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                <span>Voice Call</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleDecline}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
          
          <button
            onClick={handleAnswer}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
          >
            {incomingCall.callType === 'video' ? (
              <Video className="w-8 h-8 text-white" />
            ) : (
              <Phone className="w-8 h-8 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;