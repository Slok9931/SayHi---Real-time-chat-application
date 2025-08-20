import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";
import CallInterface from "../components/CallInterface";
import IncomingCall from "../components/IncomingCall";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const { subscribeToCallEvents, unsubscribeFromCallEvents } = useCallStore();
  const { socket } = useAuthStore();

  useEffect(() => {
    // Only subscribe to call events when socket is available
    if (socket) {
      subscribeToCallEvents();
      return () => unsubscribeFromCallEvents();
    }
  }, [socket, subscribeToCallEvents, unsubscribeFromCallEvents]);

  const renderChatContent = () => {
    if (selectedUser) {
      return <ChatContainer />;
    } else if (selectedGroup) {
      return <GroupChatContainer />;
    } else {
      return <NoChatSelected />;
    }
  };

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {renderChatContent()}
          </div>
        </div>
      </div>

      {/* Call Components */}
      <CallInterface />
      <IncomingCall />
    </div>
  );
};

export default HomePage;