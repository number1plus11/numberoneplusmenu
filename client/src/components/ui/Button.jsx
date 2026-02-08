import { cn } from "@/lib/utils";

export const Button = ({ className, variant = "primary", size = "md", ...props }) => {
    const variants = {
        primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-md",
        secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
        outline: "border-2 border-slate-200 hover:bg-slate-100 text-slate-900",
        ghost: "hover:bg-slate-100 text-slate-700",
        danger: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2",
        lg: "px-6 py-3 text-lg",
        icon: "p-2",
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
};
