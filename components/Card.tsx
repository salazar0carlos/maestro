import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card = React.memo(function Card({ 
  children, 
  className = '', 
  hover = false, 
  ...props 
}: CardProps) {
  const hoverStyles = hover ? 'hover:bg-slate-700 hover:border-slate-600 transition cursor-pointer' : '';
  
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-800 p-4 ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
