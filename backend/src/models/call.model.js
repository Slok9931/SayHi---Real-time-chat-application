import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      joinedAt: Date,
      leftAt: Date,
      status: {
        type: String,
        enum: ['calling', 'joined', 'declined', 'missed', 'left'],
        default: 'calling'
      }
    }],
    callType: {
      type: String,
      enum: ['voice', 'video'],
      required: true
    },
    chatType: {
      type: String,
      enum: ['direct', 'group'],
      required: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group"
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    status: {
      type: String,
      enum: ['calling', 'ongoing', 'ended', 'declined', 'missed'],
      default: 'calling'
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number // in seconds
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);
export default Call;