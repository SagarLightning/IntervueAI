import { createBrowserRouter, Navigate } from 'react-router';
import Register from './features/auth/pages/register';
import Login from './features/auth/pages/login';
import ErrorPage from './components/ErrorPage';
import Protected from './features/auth/components/protected';
import Home from './features/interview/pages/Home';
import Interview from "./features/interview/pages/Interview";
import SessionStart from "./features/interviewSession/pages/SessionStart";
import InterviewRoom from "./features/interviewSession/pages/InterviewRoom";



export const router = createBrowserRouter([
    {
        path: '/',
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <Navigate to="/login" replace />
            },
            {
                path: 'register',
                element: <Register />
            },
            {
                path: 'login',
                element: <Login />
            },
            {
                path: 'home',
                element: <Protected><Home /></Protected>
            },
            {
                path: 'interview/:interviewId',
                element: <Protected><Interview /></Protected>
            },
            {
                path: 'interview-session/start',
                element: <Protected><SessionStart /></Protected>
            },
            {
                path: 'interview-session/:sessionId',
                element: <Protected><InterviewRoom /></Protected>
            }
        ]
    }
]);