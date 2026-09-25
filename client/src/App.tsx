import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './app/providers/ThemeProvider';
import { AuthProvider } from './features/auth/AuthContext';
import { router } from './app/router';

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
