import { LOGO_DOTS, LOGO_SIZE } from "@/constants/logo-mark";
import { cn } from "@/lib/utils";

export const LogoMark = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}
    fill="currentColor"
    className={cn("size-4", className)}
    {...props}
  >
    {LOGO_DOTS.map(({ cx, cy, opacity, r }) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} opacity={opacity} />
    ))}
  </svg>
);
