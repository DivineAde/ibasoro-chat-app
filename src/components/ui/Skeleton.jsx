import { cn } from "../../lib/cn";

export const Skeleton = ({ className }) => <div aria-hidden className={cn("skeleton rounded-control", className)} />;
