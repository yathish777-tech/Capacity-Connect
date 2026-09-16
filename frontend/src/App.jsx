import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Loader from './components/Loader'

import Login from './modules/auth/Login'
import Signup from './modules/auth/Signup'

import AdminDashboard, { AdminOverview } from './modules/admin/AdminDashboard'
import UserManagement from './modules/admin/UserManagement'
import TraineeApprovals from './modules/admin/TraineeApprovals'
import TrainerApprovals from './modules/admin/TrainerApprovals'
import TrainerRequirements from './modules/admin/TrainerRequirements'
import CompetencyEngine from './modules/admin/CompetencyEngine'
import CourseManagement from './modules/admin/CourseManagement'
import CourseMaterials from './modules/admin/CourseMaterials'
import AdminCertificates from './modules/admin/Certificates'
import AdminAnnouncements from './modules/admin/Announcements'
import ReportsAnalytics from './modules/admin/ReportsAnalytics'

import TrainerDashboard, { TrainerOverview } from './modules/trainer/TrainerDashboard'
import TrainerProfile from './modules/trainer/TrainerProfile'
import QuestionBank from './modules/trainer/QuestionBank'
import TraineeMonitoring from './modules/trainer/TraineeMonitoring'
import MaterialUpload from './modules/trainer/MaterialUpload'

import TraineeDashboard, { TraineeOverview } from './modules/trainee/TraineeDashboard'
import TraineeProfile from './modules/trainee/TraineeProfile'
import CourseEnrollment from './modules/trainee/CourseEnrollment'
import CourseLearning from './modules/trainee/CourseLearning'
import Assessment from './modules/trainee/Assessment'
import CertificateRequest from './modules/trainee/CertificateRequest'
import AiDoubtBot from './modules/trainee/AiDoubtBot'
import Feedback from './modules/trainee/Feedback'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Loader full />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px' } }} />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="trainee-approvals" element={<TraineeApprovals />} />
            <Route path="trainer-approvals" element={<TrainerApprovals />} />
            <Route path="trainer-requirements" element={<TrainerRequirements />} />
            <Route path="competency-engine" element={<CompetencyEngine />} />
            <Route path="course-management" element={<CourseManagement />} />
            <Route path="course-materials" element={<CourseMaterials />} />
            <Route path="certificates" element={<AdminCertificates />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="reports" element={<ReportsAnalytics />} />
          </Route>

          <Route
            path="/trainer"
            element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<TrainerOverview />} />
            <Route path="profile" element={<TrainerProfile />} />
            <Route path="question-bank" element={<QuestionBank />} />
            <Route path="monitoring" element={<TraineeMonitoring />} />
            <Route path="materials" element={<MaterialUpload />} />
          </Route>

          <Route
            path="/trainee"
            element={
              <ProtectedRoute allowedRoles={['trainee']}>
                <TraineeDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<TraineeOverview />} />
            <Route path="profile" element={<TraineeProfile />} />
            <Route path="courses" element={<CourseEnrollment />} />
            <Route path="learning/:courseId" element={<CourseLearning />} />
            <Route path="certificates" element={<CertificateRequest />} />
            <Route path="doubt-bot" element={<AiDoubtBot />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>

          {/* Standalone, distraction-free exam view - deliberately outside the sidebar layout */}
          <Route
            path="/trainee/assessment/:questionnaireId"
            element={
              <ProtectedRoute allowedRoles={['trainee']}>
                <Assessment />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
