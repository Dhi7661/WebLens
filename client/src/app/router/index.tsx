import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LandingPage } from '../../pages/LandingPage';
import { LoginPage } from '../../pages/LoginPage';
import { RegisterPage } from '../../pages/RegisterPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { AnalyzePage } from '../../pages/AnalyzePage';
import { ReportPage } from '../../pages/ReportPage';
import { HistoryPage } from '../../pages/HistoryPage';
import { ComparePage } from '../../pages/ComparePage';
import { SettingsPage } from '../../pages/SettingsPage';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'analyze',
        element: <AnalyzePage />,
      },
      {
        path: 'reports/:scanId',
        element: <ReportPage />,
      },
      {
        path: 'share/:shareToken',
        element: <ReportPage isPublicView />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'compare',
        element: <ComparePage />,
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
