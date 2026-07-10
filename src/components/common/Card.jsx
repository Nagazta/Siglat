import clsx from "clsx";

/**
 * Reusable Card component with optional hover effect and padding variants.
 */
export default function Card({
  children,
  className = "",
  hoverable = false,
  padding = "default",
  onClick,
}) {
  const paddings = {
    none: "",
    sm: "p-4",
    default: "p-6",
    lg: "p-8",
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-2xl border border-border shadow-card",
        paddings[padding],
        hoverable && "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
