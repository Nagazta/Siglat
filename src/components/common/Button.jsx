import clsx from "clsx";

/**
 * Reusable Button component.
 * @param {"primary"|"secondary"|"outline"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"} size
 * @param {boolean} loading
 * @param {boolean} fullWidth
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className = "",
  disabled = false,
  type = "button",
  onClick,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-dark focus:ring-primary/40 shadow-sm hover:shadow-glow",
    secondary:
      "bg-secondary/10 text-secondary hover:bg-secondary/20 focus:ring-secondary/30",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/30",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200",
    danger:
      "bg-danger text-white hover:bg-red-600 focus:ring-danger/40",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        (disabled || loading) && "opacity-60 cursor-not-allowed active:scale-100",
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
