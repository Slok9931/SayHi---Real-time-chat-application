# 💬 SayHi – Real-Time Chat Application

**SayHi** is a responsive and feature-rich real-time chat application built using the **MERN** stack and **Socket.IO**. It enables users to communicate instantly, securely, and with a delightful user experience. With built-in authentication, theme customization, and powerful messaging features, SayHi is perfect for both personal and professional use.

## 🚀 Features

* ⚡ **Real-time messaging** using WebSockets (Socket.IO)
* 🔐 **Secure authentication** with JWT (JSON Web Tokens)
* 🧑‍🤝‍🧑 **One-on-one chat feature**
* 🎨 **32 unique themes** powered by DaisyUI
* 🧭 **Responsive UI** for mobile, tablet, and desktop
* 🧾 **Chat history persistence** with MongoDB
* 🧼 **Clean, minimal design** with custom dark/light themes
* 🪪 **User profiles** and status indicators
* 📎 **Media and file sharing**

## 🌐 Live Demo

🔗 [Visit SayHi Now](https://sayhi-real-time-chat-application.onrender.com/)

*(Note: Initial load may take a few seconds due to free-tier hosting)*

## 🛠️ Tech Stack

* **Frontend:** React.js, Tailwind CSS, DaisyUI
* **Backend:** Node.js, Express.js, Socket.IO
* **Database:** MongoDB + Mongoose
* **Authentication:** JWT, bcrypt.js
* **State Management:** Zustand
* **Deployment:** Render (Fullstack)

## 📸 Screenshots

![image](https://github.com/user-attachments/assets/7d290ea8-111c-430c-9e7c-69c95bd6ec43)
![image](https://github.com/user-attachments/assets/def7d5eb-99dd-4a99-b941-b3f71a8c4edd)
![image](https://github.com/user-attachments/assets/73d5df2e-5459-4159-b3a2-ec7fa993b6cb)


## 📂 Folder Structure

```
sayhi-chat-app/
├── frontend/         # React frontend
│   └── ...
├── backend/         # Node.js backend
│   └── ...
├── README.md
└── ...
```

## 🧑‍💻 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Slok9931/SayHi---Real-time-chat-application.git
cd SayHi---Real-time-chat-application
```

### 2. Install dependencies

#### For client:

```bash
cd frontend
npm install
```

#### For server:

```bash
cd backend
npm install
```

### 3. Environment Variables

Create a `.env` file inside the `backend` directory and configure the following:

```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

Create a `.env` file in `frontend` if needed:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Run the app

#### Start the server:

```bash
cd backend
npm run dev
```

#### Start the frontend:

```bash
cd frontend
npm run dev
```

## ✨ Customization

* 🌈 Switch between 32 pre-built themes using DaisyUI
* 💻 Easily extend with emojis, file sharing, or reactions

## 🧪 Future Enhancements

* 🛡️ Block/report users
* 📱 Mobile app version (React Native)
* 🔔 Push notifications

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙌 Acknowledgements

* [Socket.IO](https://socket.io/)
* [DaisyUI](https://daisyui.com/)
* [Render](https://render.com/)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
