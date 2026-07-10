import { RouterProvider } from "react-router-dom";
import router from "./router";
import { ReportsProvider } from "./context/ReportsContext";

/**
 * Root App component.
 * Wraps the entire application with global providers.
 */
export default function App() {
  return (
    <ReportsProvider>
      <RouterProvider router={router} />
    </ReportsProvider>
  );
}
