cd ui-task-generator
cp .env.example .env       # rồi điền token vào
npm install
npm run dev                # mở http://localhost:3001
```

**Cấu trúc bên trong zip:**
```
ui-task-generator/
├── server.js        ← Express proxy, đọc .env, forward sang Anthropic
├── public/
│   └── index.html   ← toàn bộ UI (không cần build step)
├── .env.example     ← copy thành .env rồi điền token
├── .gitignore
├── package.json
└── README.md