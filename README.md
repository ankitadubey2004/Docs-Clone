
# 📑 Collab Docs  

> A **real-time collaborative document editor** where teams can create, edit, and manage documents together — with live updates, cursor sharing, and export options.  

Built with **MERN + Socket.IO + Quill**, deployed on **Render (backend)** and **Vercel (frontend)**.  

---

## ✨ Features  

- 🔐 **Authentication & Authorization** – Secure JWT-based login & signup with password hashing (bcrypt).  
- 📝 **Real-time Collaboration** – Low-latency document editing with **Socket.IO**.  
- 👥 **Multi-user Editing** – Multiple users can work on the same document simultaneously.  
- 📌 **Live Cursor & Presence** – See where collaborators are typing in real time.  
- 📂 **Document Management** – Create, edit, delete, and organize documents.  
- 📜 **Version Control** – Auto-save + ability to restore past versions.  
- 📤 **Export Documents** – Export as **PDF** or **DOCX**.  
- 🌐 **Cross-platform Deployment** – Backend on Render, Frontend on Vercel.  
- 🎨 **Modern UI** – Clean, responsive React + TailwindCSS design.  

---

## 🏗️ Tech Stack  

### **Frontend (React + Vite)**  
- ⚛️ React (with Vite)  
- 🎨 TailwindCSS  
- ✍️ Quill.js Rich Text Editor  
- 🔗 Axios (API calls)  
- 🌍 Deployed on **Vercel**  

### **Backend (Node + Express)**  
- 🚀 Express.js REST API  
- 🔌 Socket.IO for real-time sync  
- 🗄️ MongoDB + Mongoose ODM  
- 🔐 JWT Authentication  
- 📝 Quill Delta + Delta-to-HTML  
- 📄 docx, pdf-lib, html-pdf for export  
- 🌍 Deployed on **Render**  

---

## 📂 Project Structure  

```

collab-docs/
│── frontend/           # React + Vite app (UI, Quill editor, Tailwind)
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Dashboard, Editor, Login/Register
│   │   ├── hooks/      # Custom hooks
│   │   └── utils/      # Helpers (API config, auth)
│   └── package.json    # Frontend dependencies
│
│── backend/            # Node.js + Express + Socket.IO server
│   ├── models/         # Mongoose models (User, Document)
│   ├── routes/         # Express routes (auth, documents, users)
│   ├── middleware/     # Auth middleware
│   ├── server.js       # Entry point (Express + Socket.IO)
│   └── package.json    # Backend dependencies
│
└── README.md           # This file

````

---

## 🚀 Getting Started  

### 1️⃣ Clone the repository  
```bash
git clone https://github.com/sebastian-sultz/Docs-Clone.git
cd Docs-Clone
````

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

Run backend server:

```bash
npm run dev
```

Server runs at → [http://localhost:5000](http://localhost:5000)

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_BACKEND_URL=http://localhost:5000
```

Run frontend app:

```bash
npm run dev
```

Frontend runs at → [http://localhost:5173](http://localhost:5173)

---

## 🌐 Deployment

### Backend → Render

* Build Command: `npm install`
* Start Command: `npm start`
* Add Environment Variables in Render dashboard

### Frontend → Vercel

* Framework: **Vite + React**
* Add env variable:

  ```
  VITE_BACKEND_URL=https://your-backend.onrender.com
  ```

---

## 🧪 API Endpoints

### Auth

* `POST /api/auth/register` → Register new user
* `POST /api/auth/login` → Login & get JWT

### Documents

* `POST /api/documents` → Create new document
* `GET /api/documents/:id` → Get document by ID
* `PUT /api/documents/:id` → Update document
* `DELETE /api/documents/:id` → Delete document

### WebSockets

* `join-doc` → Join a document room
* `doc-delta` → Broadcast changes
* `cursor-update` → Share live cursor
* `save-doc` → Auto-save on edit

---

## 🧑‍🤝‍🧑 Contributing

Contributions are welcome 🎉

1. Fork the repo
2. Create a new branch (`feature/amazing-feature`)
3. Commit your changes
4. Open a Pull Request 🚀

---

## 📜 License

This project is licensed under the **MIT License** – use it freely!

---

## ⭐ Acknowledgments

* [Quill.js](https://quilljs.com/) – rich text editing
* [Socket.IO](https://socket.io/) – real-time collaboration
* [MongoDB Atlas](https://www.mongodb.com/atlas) – database hosting
* [Render](https://render.com/) & [Vercel](https://vercel.com/) – deployment platforms

---

### 🎉 Pro Tip

If you like this project, **leave a star ⭐ on GitHub** — it helps the project grow!

