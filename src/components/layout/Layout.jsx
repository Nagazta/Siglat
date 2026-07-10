import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "../common/ScrollToTop";
import ErrorBoundary from "../common/ErrorBoundary";

/**
 * Root layout — wraps every page with Navbar, Footer, ErrorBoundary,
 * and the floating ScrollToTop button.
 */
export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 animate-fade-in">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
