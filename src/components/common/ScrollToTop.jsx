import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import clsx from "clsx";

/**
 * Floating "scroll to top" button — appears after the user scrolls
 * more than 300px down the page.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollUp}
      aria-label="Scroll to top"
      className={clsx(
        "fixed bottom-6 right-6 z-50 w-10 h-10 rounded-xl bg-primary text-white shadow-glow",
        "flex items-center justify-center transition-all duration-300",
        "hover:bg-primary-dark hover:scale-110 active:scale-95",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp size={18} />
    </button>
  );
}
