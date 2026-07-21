import Image from "next/image";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

export function AppLogo({ showText = true, size = "md", className }: AppLogoProps) {
  const dimension = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="SharkMoney logo"
        width={dimension}
        height={dimension}
        className="rounded-lg object-contain"
        priority
      />
      {showText && (
        <span className="font-semibold tracking-tight">
          Shark<span className="text-primary">Money</span>
        </span>
      )}
    </div>
  );
}
