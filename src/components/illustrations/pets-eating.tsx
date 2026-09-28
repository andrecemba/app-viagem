import { cn } from "@/lib/utils";

/**
 * Ilustração própria (sem imagem de terceiros): cachorro e gato comendo ração.
 * Traço escuro e cores chapadas, no mesmo estilo dos ícones do site.
 */
export function PetsEatingIllustration({ className }: { className?: string }) {
  const ink = "#1f2933";
  return (
    <svg viewBox="0 0 400 230" role="img" aria-label="Ilustração de um cachorro e um gato comendo ração" className={cn("h-auto w-full", className)}>
      {/* fundo */}
      <ellipse cx="200" cy="130" rx="190" ry="96" fill="var(--brand-soft)" />
      <circle cx="58" cy="52" r="6" fill="var(--brand)" opacity=".25" />
      <circle cx="350" cy="44" r="9" fill="var(--brand)" opacity=".2" />
      <circle cx="330" cy="72" r="4" fill="var(--brand)" opacity=".3" />
      {/* chão */}
      <path d="M22 204h356" stroke={ink} strokeWidth="3" strokeLinecap="round" />

      {/* ── cachorro ── */}
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* rabo */}
        <path d="M48 128c-14-8-20-26-12-40" fill="none" />
        {/* pernas de trás */}
        <path d="M62 150v50h16v-42" fill="#c98a4b" />
        <path d="M84 156v44h15v-40" fill="#b8793c" />
        {/* corpo */}
        <path d="M50 126c0-24 26-36 62-36s56 10 62 30c4 16-4 34-26 40-26 7-62 6-80-2-12-6-18-16-18-32z" fill="#d99a5b" />
        <path d="M78 150c10 6 34 8 52 2" fill="none" opacity=".5" />
        {/* pernas da frente */}
        <path d="M128 150v50h16v-50" fill="#c98a4b" />
        <path d="M146 144v56h15v-52" fill="#d99a5b" />
        {/* pescoço e cabeça abaixada */}
        <path d="M160 112c14 6 24 22 30 42l-22 8c-6-14-14-24-24-30z" fill="#d99a5b" />
        <path d="M168 150c4-18 18-26 34-22 16 4 22 18 20 32-2 10-10 16-20 16h-18c-12 0-20-12-16-26z" fill="#d99a5b" />
        {/* orelha */}
        <path d="M178 132c-10 2-16 14-14 28 2 8 10 8 12 0 2-10 4-18 6-24z" fill="#9c6330" />
        {/* olho fechado de satisfação */}
        <path d="M196 146c3 3 7 3 10 0" fill="none" />
        {/* coleira */}
        <path d="M160 116c10 4 16 12 20 22" fill="none" stroke="var(--brand)" strokeWidth="7" />
      </g>
      {/* manchas */}
      <ellipse cx="96" cy="112" rx="16" ry="10" fill="#b8793c" opacity=".55" />

      {/* tigela do cachorro */}
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
        <path d="M188 176h74l-8 28h-58z" fill="var(--brand)" />
        <path d="M184 176h82" strokeLinecap="round" />
      </g>
      <g fill="#8a5a2b" stroke={ink} strokeWidth="1.5">
        <circle cx="228" cy="172" r="4.5" />
        <circle cx="238" cy="170" r="4.5" />
        <circle cx="248" cy="173" r="4" />
        <circle cx="218" cy="173" r="4" />
        <circle cx="233" cy="165" r="4" />
        <circle cx="243" cy="164" r="3.5" />
      </g>

      {/* ── gato ── */}
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* rabo */}
        <path d="M356 180c16-6 22-26 12-44-6-10-18-10-20 0" fill="none" />
        {/* corpo agachado */}
        <path d="M292 200c-10 0-14-10-10-22 6-20 26-32 50-30 22 2 32 20 28 36-2 10-10 16-20 16z" fill="#7b8794" />
        {/* patas */}
        <path d="M300 200h20" />
        <path d="M288 188c-4 6-6 12-4 16h16" fill="#7b8794" />
        {/* cabeça abaixada */}
        <path d="M276 170c-4-12 4-24 18-26 14-2 24 8 24 20 0 10-8 18-20 18h-8c-6 0-12-4-14-12z" fill="#7b8794" />
        {/* orelhas */}
        <path d="M284 150l-2-16 12 10" fill="#7b8794" />
        <path d="M302 144l8-12 2 16" fill="#7b8794" />
        {/* olho fechado */}
        <path d="M284 166c3 2 6 2 9 0" fill="none" />
        {/* listras */}
        <path d="M322 152c2 6 2 12 0 16M336 152c2 6 2 12 0 18" fill="none" opacity=".6" />
      </g>
      {/* bigodes */}
      <path d="M272 176l-14-2M272 180l-14 4" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />

      {/* tigela do gato */}
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
        <path d="M232 186h40l-5 18h-30z" fill="#e8a33d" />
        <path d="M229 186h46" strokeLinecap="round" />
      </g>
      <g fill="#8a5a2b" stroke={ink} strokeWidth="1.5">
        <circle cx="246" cy="183" r="3.5" />
        <circle cx="255" cy="182" r="3.5" />
        <circle cx="251" cy="177" r="3" />
      </g>
    </svg>
  );
}
