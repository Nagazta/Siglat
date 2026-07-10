import { Suspense } from "react";
import Loading from "./Loading";

/**
 * Wraps lazy-loaded pages in a Suspense boundary.
 */
export default function PageWrapper({ children }) {
  return (
    <Suspense fallback={<Loading size="page" message="Loading..." />}>
      {children}
    </Suspense>
  );
}
