/**
 * Loading spinner component.
 * @param {"sm"|"md"|"lg"|"page"} size
 * @param {string} message - Optional loading message
 */
export default function Loading({ size = "md", message = "" }) {
  const sizes = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-[3px]",
    page: "h-16 w-16 border-4",
  };

  if (size === "page") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div
          className={`${sizes[size]} rounded-full border-primary/20 border-t-primary animate-spin`}
        />
        {message && <p className="text-muted text-sm font-medium">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className={`${sizes[size]} rounded-full border-primary/20 border-t-primary animate-spin`}
      />
      {message && <p className="text-muted text-sm">{message}</p>}
    </div>
  );
}
