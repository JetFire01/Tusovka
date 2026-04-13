import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-7",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-surface-card rounded-[var(--radius-apple-lg)]
          shadow-[var(--shadow-apple)]
          ${paddingStyles[padding]}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold text-text-primary ${className}`}
      {...props}
    />
  );
}

function CardDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-text-secondary mt-1 ${className}`}
      {...props}
    />
  );
}

export { Card, CardTitle, CardDescription };
