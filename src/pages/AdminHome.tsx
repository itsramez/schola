import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  GraduationCap,
  LineChart,
  Megaphone,
  UserCog,
  Users2,
} from "lucide-react";
import { schoolStats } from "../data/mockData";
import { useAppData } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { useCurrentPersona } from "../hooks/useCurrentPersona";
import { getGreeting } from "../dateUtils";
import RiskAlerts from "../components/RiskAlerts";
import LauncherTile from "../components/LauncherTile";
import { StatCard } from "./admin/adminShared";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function AdminHome() {
  const { realStudents, subjects } = useAppData();
  const { profile, schoolName } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "admin";
  const persona = useCurrentPersona();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">
          {getGreeting()}, {persona.name.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Here's how {isReal ? schoolName ?? "your school" : "Schola Academy"} is doing.
        </p>
      </header>

      {/* Alerts */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">Risk Alerts</h2>
        <RiskAlerts />
      </section>

      {/* Analytics */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">School Analytics</h2>
        <div className={`grid grid-cols-2 gap-3 ${isReal ? "" : "lg:grid-cols-4"}`}>
          {isReal ? (
            <>
              <StatCard icon={GraduationCap} value={realStudents.length.toLocaleString()} label="Students" />
              <StatCard icon={UserCog} value={subjects.length.toLocaleString()} label="Teachers" />
            </>
          ) : (
            <>
              <StatCard icon={GraduationCap} value={schoolStats.studentCount.toLocaleString()} label="Students" />
              <StatCard icon={UserCog} value={schoolStats.teacherCount.toLocaleString()} label="Teachers" />
              <StatCard icon={BookOpen} value={schoolStats.classCount.toLocaleString()} label="Classes" />
              <StatCard icon={BarChart3} value={`${schoolStats.weeklyEngagementPct}%`} label="Weekly engagement" />
            </>
          )}
        </div>
      </section>

      {/* Launcher tiles */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">Manage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <LauncherTile to="/admin-people" icon={Users2} label="People" badge="Students, teachers, parents" />
          <LauncherTile to="/admin-academics" icon={BookOpen} label="Academics" badge="Classes, subjects, timetables" />
          <LauncherTile to="/admin-calendar" icon={Calendar} label="Calendar" badge="Exams & master calendar" />
          <LauncherTile to="/admin-attendance" icon={CheckSquare} label="Attendance" badge="School-wide oversight" />
          <LauncherTile to="/admin-announcements" icon={Megaphone} label="Announcements" badge="Create & review" />
          <LauncherTile to="/admin-insights" icon={LineChart} label="Insights" badge="Grades, attendance, quizzes" />
        </div>
      </section>
    </div>
  );
}
