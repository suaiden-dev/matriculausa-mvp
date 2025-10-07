// Exemplo de como adicionar as rotas de chat no seu router
// Este arquivo é só um exemplo - você deve adicionar essas rotas no seu router principal

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminChatPage from '../pages/AdminDashboard/AdminChatPage';
import StudentChatPage from '../pages/StudentDashboard/StudentChatPage';

// Para o Admin Dashboard
const AdminDashboardRoutes = () => {
  return (
    <Routes>
      {/* Outras rotas do admin... */}
      <Route path="/chat" element={<AdminChatPage />} />
      {/* Mais rotas... */}
    </Routes>
  );
};

// Para o Student Dashboard  
const StudentDashboardRoutes = () => {
  return (
    <Routes>
      {/* Outras rotas do estudante... */}
      <Route path="/chat" element={<StudentChatPage />} />
      {/* Mais rotas... */}
    </Routes>
  );
};

// Exemplo de rotas completas que você pode usar:
/*
Admin routes:
- /admin/dashboard/chat

Student routes:  
- /student/dashboard/chat
*/

export { AdminDashboardRoutes, StudentDashboardRoutes };