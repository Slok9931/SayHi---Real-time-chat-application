import mongoose from "mongoose"

const messaeSchema = new mongoose.Schema(
    {
        senderId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        receiverId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        groupId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group"
        },
        text:{
            type: String
        },
        image:{
            type: String
        },
        messageType: {
            type: String,
            enum: ['direct', 'group'],
            default: 'direct'
        }
    },
    {timestamps: true}
)
const Message = mongoose.model("Message", messaeSchema)
export default Message