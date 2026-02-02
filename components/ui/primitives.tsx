import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost', asChild?: boolean }>(({ className, variant = 'default', asChild, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
  const variants = {
    default: "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 glow-button border border-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    outline: "border border-input bg-transparent hover:bg-accent/10 hover:text-accent text-foreground hover:border-accent/50",
    ghost: "hover:bg-accent/10 hover:text-accent text-foreground"
  };
  return <button ref={ref} className={`${baseStyles} ${variants[variant]} ${className}`} {...props} />;
});

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return <input ref={ref} className={`flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground ${className}`} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={`flex min-h-[60px] w-full rounded-md border border-input bg-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground ${className}`} {...props} />;
});

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm backdrop-blur-sm premium-card ${className}`} {...props} />
));

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
));

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={`font-semibold leading-none tracking-tight text-foreground ${className}`} {...props} />
));

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={`text-sm text-muted-foreground ${className}`} {...props} />
));

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
));

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`} {...props} />
));

export const Badge = ({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }) => {
  const variants = {
    default: "border-transparent bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
    outline: "text-foreground border-border",
    success: "border-transparent bg-green-500/10 text-green-500 border border-green-500/20",
    warning: "border-transparent bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
  };
  return <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`} {...props} />;
};

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-input px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground appearance-none ${className}`} {...props}>
      {children}
    </select>
  </div>
));

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground ${className}`} {...props} />
));

export const Toaster = () => (
  <div id="toaster-root" className="fixed top-0 right-0 p-4 z-50 flex flex-col gap-2"></div>
);

export const toast = {
  success: (msg: string) => console.log(`Success: ${msg}`),
  error: (msg: string) => console.error(`Error: ${msg}`),
  info: (msg: string) => console.log(`Info: ${msg}`)
};
