import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }) => (
    <div
        className={cn(
            "rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm",
            className
        )}
        {...props}
    />
);

export const CardHeader = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
    <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
    <div className={cn("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }) => (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
