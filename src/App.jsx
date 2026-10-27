import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "./components/ui/Spinner";
import { ChatLayout } from "./routes/ChatLayout";
import { GuestOnly, RequireAuth } from "./routes/guards";
import { NotFound } from "./routes/NotFound";
import { EmptyConversation } from "./features/chat/EmptyConversation";
import { ChatView } from "./features/chat/ChatView";

// Auth screens are only needed before sign-in, so they stay out of the chat bundle.
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const SignupPage = lazy(() => import("./features/auth/SignupPage"));

const Fallback = () => (
  <div className="flex h-full items-center justify-center text-ink-3">
    <Spinner className="h-6 w-6" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chats" element={<Navigate to="/chat" replace />} /> {/* v1 URL */}

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/chat" element={<ChatLayout />}>
            <Route index element={<EmptyConversation />} />
            <Route path=":chatId" element={<ChatView />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
