'use client';
import { ReactNode } from 'react';

export default function PageWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`page page-enter ${className}`}>
      {children}
    </div>
  );
}
