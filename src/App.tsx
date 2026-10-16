import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./store/AppDataContext";
import { MessagingProvider } from "./store/MessagingContext";
import { RoleProvider } from "./store/RoleContext";
import { AuthProvider, useAuth } from "./store/AuthContext";
import AuthGate from "./components/AuthGate";
import Layout from "./components/layout/Layout";
import OwnerLayout from "./components/layout/OwnerLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import Agenda from "./pages/Agenda";
import Classes from "./pages/Classes";
import Assignments from "./pages/Assignments";
import StudentQuizzes from "./pages/StudentQuizzes";
import Messages from "./pages/Messages";
import Announcements from "./pages/Announcements";
import CalendarPage from "./pages/CalendarPage";
import Profile from "./pages/Profile";
import TeacherQuizzes from "./pages/TeacherQuizzes";
import TeacherAssignments from "./pages/TeacherAssignments";
import TeacherInsights from "./pages/TeacherInsights";
import AdminPeople from "./pages/AdminPeople";
import AdminAcademics from "./pages/AdminAcademics";
import AdminCalendar from "./pages/AdminCalendar";
import AdminAttendance from "./pages/AdminAttendance";
import AdminFees from "./pages/AdminFees";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminInsights from "./pages/AdminInsights";
import OwnerHome from "./pages/OwnerHome";
import OwnerSchoolDetail from "./pages/OwnerSchoolDetail";

/** The normal student/teacher/admin/parent app — everything that existed before the owner layer. */
function SchoolAppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="classes" element={<Classes />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="quizzes" element={<StudentQuizzes />} />
        <Route path="messages" element={<Messages />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="profile" element={<Profile />} />
        <Route path="teacher-quizzes" element={<TeacherQuizzes />} />
        <Route path="teacher-assignments" element={<TeacherAssignments />} />
        <Route path="teacher-insights" element={<TeacherInsights />} />
        <Route path="admin-people" element={<AdminPeople />} />
        <Route path="admin-academics" element={<AdminAcademics />} />
        <Route path="admin-calendar" element={<AdminCalendar />} />
        <Route path="admin-attendance" element={<AdminAttendance />} />
        <Route path="admin-fees" element={<AdminFees />} />
        <Route path="admin-announcements" element={<AdminAnnouncements />} />
        <Route path="admin-insights" element={<AdminInsights />} />
      </Route>
    </Routes>
  );
}

/** The platform owner's thin oversight app — lists every school and toggles per-school features. */
function OwnerAppRoutes() {
  return (
    <Routes>
      <Route element={<OwnerLayout />}>
        <Route index element={<OwnerHome />} />
        <Route path="schools/:schoolId" element={<OwnerSchoolDetail />} />
      </Route>
    </Routes>
  );
}

/** Picks between the owner app and the normal school app based on which profile this login resolved to. */
function RootRouter() {
  const { ownerProfile } = useAuth();
  return ownerProfile ? <OwnerAppRoutes /> : <SchoolAppRoutes />;
}

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <AppDataProvider>
          <MessagingProvider>
            <BrowserRouter>
              <Routes>
                <Route path="login" element={<Login />} />
                <Route element={<AuthGate />}>
                  <Route path="/*" element={<RootRouter />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </MessagingProvider>
        </AppDataProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
