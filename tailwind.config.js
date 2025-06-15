module.exports = {
    purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    darkMode: 'class', 
    theme: {
      extend: {
        colors: {
          border: 'var(--border)',
          overlay: 'var(--overlay)',
          background: 'var(--background)',
          foreground: 'var(--foreground)',
          placeholder: 'var(--placeholder)',
          primary: {
            DEFAULT: 'var(--primary)',
            hover: 'var(--primary-hover)',
            foreground: 'var(--primary-foreground)'
          },
          secondary: {
            DEFAULT: 'var(--secondary)',
            hover: 'var(--secondary-hover)',
            foreground: 'var(--secondary-foreground)'
          },
          accent: {
            DEFAULT: 'var(--accent)',
            hover: 'var(--accent-hover)',
            foreground: 'var(--accent-foreground)'
          },
          danger: {
            DEFAULT: 'var(--danger)',
            hover: 'var(--danger-hover)',
            foreground: 'var(--danger-foreground)'
          },
          muted: {
            DEFAULT: 'var(--muted)',
            hover: 'var(--muted-hover)',
            foreground: 'var(--muted-foreground)'
          },
          navbar: {
            DEFAULT: 'var(--navbar)',
            hover: 'var(--navbar-hover)',
            foreground: 'var(--navbar-foreground)'
          },
          table: {
            DEFAULT: 'var(--table)',
            hover: 'var(--table-hover)',
            head: {
              DEFAULT: 'var(--table-head)',
              hover: 'var(--table-head-hover)'
            },
            foreground: 'var(--table-foreground)'
          },
          card: {
            DEFAULT: 'var(--card)',
            hover: 'var(--card-hover)',
            foreground: 'var(--card-foreground)'
          },
          modal: {
            DEFAULT: 'var(--modal)',
            hover: 'var(--modal-hover)',
            foreground: 'var(--modal-foreground)'
          },
          input: {
            DEFAULT: 'var(--input)',
            hover: 'var(--input-hover)',
            foreground: 'var(--input-foreground)'
          },
          skeleton: {
            DEFAULT: 'var(--skeleton)'
          }
        },
        fontFamily: {
          serif: ['Playfair Display', 'serif'],
          sans: ['Roboto', 'sans-serif'],
          script: ['Dancing Script', 'cursive']
        }
      },
    },
    variants: {
      extend: {},
    },
    plugins: [
      require('flowbite/plugin'),
      require('@tailwindcss/aspect-ratio'),
      require("@tailwindcss/forms")
    ],
    content: [
      "./node_modules/flowbite/**/*.js"
    ]
  }