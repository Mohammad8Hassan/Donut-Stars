import React, { ReactNode } from 'react'

type IconButtonProps = {
  icon: ReactNode;
  text: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({text, icon, ...props} : IconButtonProps) {
  return (
    <button className="flex rounded-2xl items-center justify-center gap-1 p-1" 
      style={{ border: "1px solid grey" }}
      {...props}
    >
      {icon}
      <span>{text}</span>
    </button>
  )
}
