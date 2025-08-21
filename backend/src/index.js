import express from "express"
import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import groupRoutes from "./routes/group.route.js"
import callRoutes from "./routes/call.route.js"
import dotenv from "dotenv"
import { connectDB } from "./lib/db.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import { app, server } from "./lib/socket.js"
import path from "path"

dotenv.config()
app.use(express.json())
app.use(cookieParser())

const port = process.env.PORT
const __dirname = path.resolve()

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/groups", groupRoutes)
app.use("/api/calls", callRoutes)

if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname, "../frontend/dist")))

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"))
    })
}

server.listen(port, ()=>{
    connectDB()
})