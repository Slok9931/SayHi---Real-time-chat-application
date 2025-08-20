import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  initiateCall,
  answerCall,
  endCall,
  getUserCalls
} from "../controllers/call.controller.js";

const router = express.Router();

router.post("/initiate", protectRoute, initiateCall);
router.post("/:callId/answer", protectRoute, answerCall);
router.post("/:callId/end", protectRoute, endCall);
router.get("/history", protectRoute, getUserCalls);

export default router;