import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx}',
    // spec 0014 Fase B: ahora que NO está Bootstrap, las clases utilitarias
    // que comparten nombre con Tailwind (mb-*, ps-*, pe-*, ms-*, gap-*…) usadas
    // SOLO en el JS legacy ya no las provee Bootstrap → hay que escanearlas para
    // que Tailwind las emita. (Antes se excluía porque Bootstrap las cubría.)
    './public/js/**/*.js',
  ],

  // Al escanear public/js (legacy), Tailwind veía la clase `collapse` (que el
  // legacy usa como COMPONENTE Bootstrap de colapso) y generaba su utilidad
  // `.collapse{visibility:collapse!important}`, que con important:true ocultaba
  // el contenido de TODOS los acordeones/colapsos del legacy. La bloqueamos:
  // el colapso lo maneja bootstrap-compat.css (display) + el shim de shared.js.
  blocklist: ['collapse'],

  // Convivencia con Bootstrap durante la migración (specs 0008-0013).
  // Reactivar (quitar esta línea) en el spec 0014 cuando se quite Bootstrap.
  corePlugins: { preflight: false },

  // Bootstrap utilities usan !important. Sin esto, Tailwind pierde por
  // especificidad (`bg-primary`, `text-primary`, etc.). Quitar en spec 0014.
  important: true,

  // ── shadcn/ui (estilo "new-york") usa `darkMode: 'class'` por defecto ──
  darkMode: 'class',

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // ── Tokens del design-system: cada uno apunta a su CSS variable ──
      // Si cambias --app-color-primary en design-system.css, Tailwind lo
      // refleja automáticamente sin tocar este config.
      colors: {
        // Tokens "crok" (sin colisión con Bootstrap .bg-primary !important
        // que se carga DESPUÉS del CSS de Next y gana en cascada).
        crok:               '#ff4700',
        'crok-hover':       '#d63900',
        'crok-soft':        '#fff1ea',
        'crok-on':          '#ffffff',
        // Compatibilidad shadcn (su Button usa bg-primary/text-primary-foreground)
        primary:               '#ff4700',
        'primary-foreground':  '#ffffff',
        'primary-hover':       '#d63900',
        'primary-soft':        '#fff1ea',
        'primary-on':          '#ffffff',
        'bg-page':       'var(--app-color-bg-page)',
        'bg-surface':    'var(--app-color-bg-surface)',
        'bg-festive':    'var(--app-color-bg-festive)',
        text:            'var(--app-color-text)',
        'text-muted':    'var(--app-color-text-muted)',
        border:          'var(--app-color-border)',
        success:         'var(--app-color-success-500)',
        warning:         'var(--app-color-warning-500)',
        danger:          'var(--app-color-danger-500)',
        info:            'var(--app-color-info-500)',

        // Variables HSL que shadcn/ui usa internamente (declaradas en globals.css).
        // Necesarias para que los componentes shadcn generados funcionen.
        background:      'hsl(var(--background))',
        foreground:      'hsl(var(--foreground))',
        card:            { DEFAULT: 'hsl(var(--card))',            foreground: 'hsl(var(--card-foreground))' },
        popover:         { DEFAULT: 'hsl(var(--popover))',         foreground: 'hsl(var(--popover-foreground))' },
        secondary:       { DEFAULT: 'hsl(var(--secondary))',       foreground: 'hsl(var(--secondary-foreground))' },
        muted:           { DEFAULT: 'hsl(var(--muted))',           foreground: 'hsl(var(--muted-foreground))' },
        accent:          { DEFAULT: 'hsl(var(--accent))',          foreground: 'hsl(var(--accent-foreground))' },
        destructive:     { DEFAULT: 'hsl(var(--destructive))',     foreground: 'hsl(var(--destructive-foreground))' },
        input:           'hsl(var(--input))',
        ring:            'hsl(var(--ring))',
      },
      fontFamily: {
        sans:       ['var(--app-font-sans)'],
        decorative: ['var(--app-font-decorative)'],
      },
      fontSize: {
        xs:    'var(--app-font-size-xs)',
        sm:    'var(--app-font-size-sm)',
        md:    'var(--app-font-size-md)',
        lg:    'var(--app-font-size-lg)',
        xl:    'var(--app-font-size-xl)',
        '2xl': 'var(--app-font-size-2xl)',
        '3xl': 'var(--app-font-size-3xl)',
      },
      spacing: {
        'page-x': 'var(--app-space-page-x)',
        'page-y': 'var(--app-space-page-y)',
      },
      borderRadius: {
        sm:   'var(--app-radius-sm)',
        md:   'var(--app-radius-md)',
        lg:   'var(--app-radius-lg)',
        pill: 'var(--app-radius-pill)',
      },
      boxShadow: {
        sm:    'var(--app-shadow-sm)',
        md:    'var(--app-shadow-md)',
        lg:    'var(--app-shadow-lg)',
        brand: 'var(--app-shadow-brand)',
      },
      // Animaciones que shadcn/ui usa por defecto (accordion).
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
