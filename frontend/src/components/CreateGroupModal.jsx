import { useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { Camera, X, Users, Loader2 } from "lucide-react";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    groupImage: null,
    selectedMembers: []
  });
  const [imagePreview, setImagePreview] = useState(null);
  
  const { createGroup, isCreatingGroup } = useGroupStore();
  const { users } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setFormData({ ...formData, groupImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleMemberToggle = (userId) => {
    const updatedMembers = formData.selectedMembers.includes(userId)
      ? formData.selectedMembers.filter(id => id !== userId)
      : [...formData.selectedMembers, userId];
    
    setFormData({ ...formData, selectedMembers: updatedMembers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    try {
      await createGroup({
        name: formData.name,
        description: formData.description,
        groupImage: formData.groupImage,
        members: formData.selectedMembers
      });
      
      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        groupImage: null,
        selectedMembers: []
      });
      setImagePreview(null);
      onClose();
    } catch (error) {
      // Error is handled in the store
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create Group</h2>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Group Image */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 text-base-content/40" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-content p-1 rounded-full cursor-pointer">
                  <Camera className="w-3 h-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>

            {/* Group Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Group Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Enter group name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Group Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description (Optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-none"
                placeholder="Enter group description"
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Member Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Add Members</span>
              </label>
              <div className="max-h-40 overflow-y-auto border border-base-300 rounded-lg p-2">
                {users.map((user) => (
                  <label key={user._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={formData.selectedMembers.includes(user._id)}
                      onChange={() => handleMemberToggle(user._id)}
                    />
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm">{user.fullName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline flex-1"
                disabled={isCreatingGroup}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isCreatingGroup || !formData.name.trim()}
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;