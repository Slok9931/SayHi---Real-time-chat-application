import { X, Users, Settings } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useState } from "react";
import GroupInfoModal from "./GroupInfoModal";

const GroupChatHeader = () => {
  const { selectedGroup, setSelectedGroup } = useGroupStore();
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Group Avatar */}
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                {selectedGroup.groupImage ? (
                  <img src={selectedGroup.groupImage} alt={selectedGroup.name} />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* Group info */}
            <div>
              <h3 className="font-medium">{selectedGroup.name}</h3>
              <p className="text-sm text-base-content/70">
                {selectedGroup.members.length} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Group info button */}
            <button 
              onClick={() => setShowGroupInfo(true)}
              className="btn btn-sm btn-ghost"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button onClick={() => setSelectedGroup(null)}>
              <X />
            </button>
          </div>
        </div>
      </div>

      <GroupInfoModal 
        isOpen={showGroupInfo} 
        onClose={() => setShowGroupInfo(false)} 
      />
    </>
  );
};

export default GroupChatHeader;