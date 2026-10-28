import type { SVGProps } from "react"
import { cn } from "../../lib/utils"

interface SpinnerProps extends SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | number
  color?: string
}

const sizeMap = { sm: 18, md: 24, lg: 32 }

export function Spinner({
  size = "md",
  color = "text-foreground",
  className,
  style,
  ...props
}: SpinnerProps) {
  const px = typeof size === "number" ? size : sizeMap[size] ?? 24
  const isToken = color.startsWith("text-")

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        // apply the color class only when it’s a raw CSS color, not a token
        !isToken && color,
        className
      )}
      style={{
        // force the spinner to its intended size (prevents the button’s
        // [&_svg]:size-* utilities from shrinking it)
        width: px,
        height: px,
        animation: "spin 0.8s steps(10, end) infinite",
        // raw color set as inline style; token colors are handled by the
        // class passed in from the parent (e.g. text-primary-foreground)
        ...(isToken ? {} : { color }),
        ...style,
      }}
      {...props}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x="11"
          y="2.5"
          width="2"
          height="5"
          rx="1"
          fill="currentColor"
          fillOpacity={(1 - (i / 10) * 0.6).toFixed(2)}
          transform={`rotate(${i * 36} 12 12)`}
        />
      ))}
    </svg>
  )
}