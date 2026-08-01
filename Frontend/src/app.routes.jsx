import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import ErrorPage from './components/ErrorPage';
import Protected from "./features/auth/components/Protected.jsx";

const Register = lazy(() => import('./features/auth/pages/register'));
const Login = lazy(() => import('./features/auth/pages/login'));
const Home = lazy(() => import('./features/interview/pages/Home'));
const Interview = lazy(() => import('./features/interview/pages/Interview'));
const SessionStart = lazy(() => import('./features/interviewSession/pages/SessionStart'));
const InterviewRoom = lazy(() => import('./features/interviewSession/pages/InterviewRoom'));
const SessionResult = lazy(() => import('./features/interviewSession/pages/SessionResult'));
const CodingRound = lazy(() => import('./features/interviewSession/pages/CodingRound'));

const SuspenseWrapper = ({ children }) => (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: '#666' }}>Loading...</div>}>
        {children}
    </Suspense>
);



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
                element: <SuspenseWrapper><Register /></SuspenseWrapper>
            },
            {
                path: 'login',
                element: <SuspenseWrapper><Login /></SuspenseWrapper>
            },
            {
                path: 'home',
                element: <Protected><SuspenseWrapper><Home /></SuspenseWrapper></Protected>
            },
            {
                path: 'interview/:interviewId',
                element: <Protected><SuspenseWrapper><Interview /></SuspenseWrapper></Protected>
            },
            {
                path: 'interview-session/start',
                element: <Protected><SuspenseWrapper><SessionStart /></SuspenseWrapper></Protected>
            },
            {
                path: 'interview-session/:sessionId',
                element: <Protected><SuspenseWrapper><InterviewRoom /></SuspenseWrapper></Protected>
            },
            {
                path: "interview-session/:sessionId/result",
                element: <Protected><SuspenseWrapper><SessionResult /></SuspenseWrapper></Protected>
            },
            {
                path: "interview-session/:sessionId/coding",
                element: <Protected><SuspenseWrapper><CodingRound /></SuspenseWrapper></Protected>
            }
        ]
    }
]);