
import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			items: '#F8E8D7',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		screens: {
  			xs: '500px',
  			'2xl': '1920px'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			glowPulse: {
  				'0%, 100%': { opacity: '0', transform: 'scale(0.96)' },
  				'50%': { opacity: '1', transform: 'scale(1.04)' }
  			},
  			bob: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-15%)' }
  			},
  			steam: {
  				'0%': { transform: 'translateY(0) scale(1)', opacity: '0.6' },
  				'100%': { transform: 'translateY(-160%) scale(1.6)', opacity: '0' }
  			},
  			drive: {
  				'0%': { transform: 'translateX(-140%) translateY(0) rotate(0deg)' },
  				'50%': { transform: 'translateX(0%) translateY(-14%) rotate(-4deg)' },
  				'100%': { transform: 'translateX(140%) translateY(0) rotate(0deg)' }
  			},
  			speedline: {
  				'0%': { transform: 'translateX(5px)', opacity: '0' },
  				'35%': { opacity: '1' },
  				'100%': { transform: 'translateX(-9px)', opacity: '0' }
  			}
  		},
  		animation: {
  			'glow-pulse': 'glowPulse 1.2s ease-in-out infinite',
  			bob: 'bob 1.4s ease-in-out infinite',
  			steam: 'steam 1.6s ease-out infinite',
  			drive: 'drive 1.6s ease-in-out infinite',
  			speedline: 'speedline 1.6s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
