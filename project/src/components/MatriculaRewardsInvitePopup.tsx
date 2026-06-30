import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModal } from "../contexts/ModalContext";

interface MatriculaRewardsInvitePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  variant?: "onboarding" | "dashboard";
  universityName?: string;
  universityLogo?: string;
  courseName?: string;
}

const USFlag: React.FC = () => (
  <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 2, marginLeft: 2, marginBottom: 1 }}>
    {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
      <rect key={i} y={i * (15/13)} width="22" height={15/13} fill={i % 2 === 0 ? "#B22234" : "#fff"} />
    ))}
    <rect width="9" height="8" fill="#3C3B6E" />
    {[0,1,2,3,4].map(r => [0,1,2,3,4,5].map(c => (
      <circle key={`a${r}${c}`} cx={0.75 + c * 1.5} cy={0.8 + r * 1.6} r="0.38" fill="#fff" />
    )))}
    {[0,1,2,3].map(r => [0,1,2,3,4].map(c => (
      <circle key={`b${r}${c}`} cx={1.5 + c * 1.5} cy={1.6 + r * 1.6} r="0.38" fill="#fff" />
    )))}
  </svg>
);

const StarIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7z" />
  </svg>
);

// Confetti ao redor do título — posicionados DEPOIS do padding (32px) do hero
const CONFETTI_LEFT: { top: number; left: number; w: number; h: number; bg: string; br: string; rot: number }[] = [
  // acima/esquerda do emoji 🎉 (~left:32)
  { top: 6,  left: 100, w: 7, h: 14, bg: "#E11D26", br: "2px", rot: 28 },
  { top: 4,  left: 160, w: 7, h: 7,  bg: "#C9CDD6", br: "50%", rot: 0 },
  { top: 8,  left: 240, w: 6, h: 6,  bg: "#2B5CC4", br: "50%", rot: 0 },
  { top: 14, left: 310, w: 7, h: 14, bg: "#E11D26", br: "2px", rot: -18 },
  // ao lado do "Parabéns!" (~top:20-60)
  { top: 38, left: 80,  w: 6, h: 12, bg: "#2B5CC4", br: "2px", rot: -32 },
  { top: 55, left: 130, w: 7, h: 7,  bg: "#E11D26", br: "50%", rot: 0 },
  { top: 45, left: 220, w: 8, h: 8,  bg: "#C9CDD6", br: "50%", rot: 0 },
  { top: 40, left: 300, w: 6, h: 12, bg: "#E11D26", br: "2px", rot: 44 },
  // abaixo de "Você foi selecionado." (~top:80-110)
  { top: 85, left: 95,  w: 6, h: 6,  bg: "#E11D26", br: "50%", rot: 0 },
  { top: 78, left: 175, w: 6, h: 11, bg: "#C9CDD6", br: "2px", rot: 22 },
  { top: 90, left: 260, w: 6, h: 6,  bg: "#2B5CC4", br: "50%", rot: 0 },
];

// Confetti around the image / right side
const CONFETTI_RIGHT: { top: number; right: number; w: number; h: number; bg: string; br: string; rot: number }[] = [
  { top: 10,  right: 50,  w: 7, h: 14, bg: "#E11D26", br: "2px", rot: -22 },
  { top: 35,  right: 28,  w: 7, h: 7,  bg: "#C9CDD6", br: "50%", rot: 0 },
  { top: 8,   right: 120, w: 6, h: 6,  bg: "#2B5CC4", br: "50%", rot: 0 },
  { top: 60,  right: 18,  w: 6, h: 12, bg: "#2B5CC4", br: "2px", rot: 30 },
  { top: 100, right: 42,  w: 7, h: 7,  bg: "#E11D26", br: "50%", rot: 0 },
  { top: 130, right: 22,  w: 6, h: 13, bg: "#C9CDD6", br: "2px", rot: -38 },
  { top: 160, right: 65,  w: 7, h: 7,  bg: "#2B5CC4", br: "50%", rot: 0 },
  { top: 55,  right: 90,  w: 6, h: 6,  bg: "#C9CDD6", br: "50%", rot: 0 },
  { top: 190, right: 38,  w: 6, h: 12, bg: "#E11D26", br: "2px", rot: 18 },
  { top: 25,  right: 170, w: 7, h: 14, bg: "#E11D26", br: "2px", rot: 50 },
];

const TUITION_LABEL = (uniName?: string) => uniName
  ? (<><strong>Descontos de até 100%</strong> na sua <strong>tuition</strong> na {uniName}.</>)
  : (<><strong>Descontos de até 100%</strong> na sua <strong>tuition</strong> em universidades participantes.</>);

const BENEFITS = (uniName?: string) => [
  {
    bg: "#E11D26",
    border: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M22 9L12 5 2 9l10 4 10-4z" fill="#fff" />
        <path d="M6 11v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4" stroke="#fff" fill="none" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    label: TUITION_LABEL(uniName),
  },
  {
    bg: "#2B5CC4",
    border: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
        <path d="M15 8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2.5l5 3.5V7l-5 3.5V8z" />
      </svg>
    ),
    label: (<><strong>Recompensas</strong> por <strong>criação de conteúdo</strong> aprovado pela nossa equipe.</>),
  },
  {
    bg: "#E11D26",
    border: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 19c0-3 3.5-4.5 7-4.5s7 1.5 7 4.5v1H2v-1zm15.5-4c2.4.2 4.5 1.5 4.5 4v1h-4v-1c0-1.6-.6-2.9-1.6-3.8.4-.1.7-.2 1.1-.2z" />
      </svg>
    ),
    label: (<><strong>Bonificações</strong> por indicações de <strong>novos estudantes.</strong></>),
  },
  {
    bg: "#2B5CC4",
    border: true,
    icon: <StarIcon size={22} color="#fff" />,
    label: (<><strong>Acesso a campanhas,</strong> novidades e oportunidades especiais.</>),
  },
];

const MatriculaRewardsInvitePopup: React.FC<MatriculaRewardsInvitePopupProps> = ({
  isOpen,
  onClose,
  onAccept,
  universityName,
  universityLogo,
  courseName,
}) => {
  const { t } = useTranslation("common");
  const { openModal, closeModal } = useModal();
  React.useEffect(() => {
    if (!isOpen) return;
    openModal();
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      closeModal();
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4"
      style={{ background: "rgba(38,42,51,0.75)", fontFamily: "'Poppins', sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full bg-white overflow-hidden overflow-y-auto"
        style={{
          maxWidth: 780,
          maxHeight: "calc(100dvh - 24px)",
          borderRadius: 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute z-30 flex items-center justify-center hover:shadow-lg transition-shadow"
          style={{
            top: 12, right: 12, width: 32, height: 32,
            borderRadius: "50%", border: "1px solid #ECECEC",
            background: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,0.10)",
            cursor: "pointer", color: "#3A3F4A",
          }}
        >
          <X size={14} strokeWidth={2.4} />
        </button>

        {/* ===== HERO DESKTOP ===== */}
        <div className="relative hidden sm:block px-8 pt-7 pb-5" style={{ overflow: "visible" }}>
          {/* Confetti */}
          <div>
            {CONFETTI_RIGHT.map((c, i) => (
              <div key={`cr-${i}`} style={{
                position: "absolute", top: c.top, right: c.right,
                width: c.w, height: c.h, background: c.bg, borderRadius: c.br,
                transform: c.rot ? `rotate(${c.rot}deg)` : undefined,
                pointerEvents: "none", zIndex: 3,
              }} />
            ))}
          </div>

          {/* 2-col grid */}
          <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 0.85fr" }}>

            {/* LEFT — copy */}
            <div className="relative z-10">
              <div className="flex items-start gap-3" style={{ paddingLeft: 48 }}>
                <span className="text-4xl leading-none">🎉</span>
                <h1 className="m-0 leading-none font-extrabold" style={{ fontSize: 38, color: "#1B2E6B", letterSpacing: -0.5 }}>
                  Parabéns!
                </h1>
              </div>

              <h2 className="mt-1.5 mb-0 font-extrabold leading-tight" style={{ fontSize: 26, color: "#E11D26", letterSpacing: -0.3, paddingLeft: 48 }}>
                Você foi selecionado.
              </h2>

              {/* Divider */}
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px rounded" style={{ background: "#E3E6EB" }} />
                <StarIcon size={9} color="#1B2E6B" />
                <StarIcon size={13} color="#2B5CC4" />
                <StarIcon size={9} color="#1B2E6B" />
                <div className="flex-1 h-px rounded" style={{ background: "#E3E6EB" }} />
              </div>

              {universityName && (
                <div className="flex items-center gap-3 mb-3 rounded-xl px-3 py-2" style={{ background: "#EEF3FF", border: "1px solid #2B5CC4", display: "inline-flex", alignSelf: "flex-start" }}>
                  {universityLogo ? (
                    <img src={universityLogo} alt={universityName} style={{ height: 28, width: "auto", maxWidth: 72, objectFit: "contain", borderRadius: 4 }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B5CC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1B2E6B" }}>
                    <strong>{universityName}</strong> participa do Programa de Embaixadores
                  </span>
                </div>
              )}

              <p className="m-0 mb-2 leading-relaxed" style={{ fontSize: 15, color: "#1B2E6B" }}>
                Você acaba de ser convidado para fazer parte do{" "}
                <strong style={{ fontWeight: 700 }}>
                  Programa de Embaixadores do Matrícula{" "}
                  <span style={{ whiteSpace: "nowrap" }}>USA! <USFlag /></span>
                </strong>
              </p>
              <p className="m-0 leading-relaxed" style={{ fontSize: 15, color: "#1B2E6B" }}>
                Seu perfil chamou nossa atenção, e acreditamos que você pode inspirar outros estudantes que também sonham em estudar nos Estados Unidos.
              </p>
            </div>

            {/* RIGHT — visual (desktop only) */}
            <div className="relative hidden sm:block" style={{ height: 280 }}>
              {/* Hero image — já tem blob azul, bandeira e confetti embutidos */}
              <img
                src="/embaixador-hero.png"
                alt="Embaixador Matrícula USA"
                style={{
                  position: "absolute",
                  top: -10,
                  right: -16,
                  height: "108%",
                  width: "auto",
                  objectFit: "contain",
                  objectPosition: "top right",
                  zIndex: 1,
                }}
              />
              {/* Badge */}
              <div style={{
                position: "absolute", bottom: -18, right: 8,
                zIndex: 5, display: "flex", alignItems: "center", gap: 8,
                background: "linear-gradient(160deg,#22397F 0%,#16285C 100%)",
                border: "2px solid #3A57A8", borderRadius: 12, padding: "8px 14px",
                boxShadow: "0 8px 20px rgba(15,28,70,0.4)", whiteSpace: "nowrap",
              }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#2B5CC4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #fff" }}>
                  <StarIcon size={13} color="#fff" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, gap: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>
                    {t("ambassador")}
                  </span>
                  <span style={{ fontSize: 7.5, fontWeight: 600, color: "#E6EAF5", letterSpacing: 1, display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ color: "#E11D26" }}>★</span>MATRÍCULA USA<span style={{ color: "#E11D26" }}>★</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MOBILE COPY ===== */}
        <div className="sm:hidden px-5 pt-4 pb-2">
          {/* Top row: text left + image right */}
          <div className="flex items-stretch gap-3">
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="text-3xl leading-none">🎉</span>
                <h1 className="m-0 leading-none font-extrabold" style={{ fontSize: 26, color: "#1B2E6B", letterSpacing: -0.5 }}>
                  Parabéns!
                </h1>
              </div>
              <h2 className="mt-1 mb-0 font-extrabold leading-tight" style={{ fontSize: 18, color: "#E11D26", letterSpacing: -0.3 }}>
                Você foi selecionado.
              </h2>
              {/* Badge mobile */}
              <div className="inline-flex items-center gap-1.5 mt-2" style={{
                background: "linear-gradient(160deg,#22397F 0%,#16285C 100%)",
                border: "1.5px solid #3A57A8", borderRadius: 8, padding: "5px 10px",
                boxShadow: "0 4px 12px rgba(15,28,70,0.35)", whiteSpace: "nowrap",
              }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2B5CC4", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff", flexShrink: 0 }}>
                  <StarIcon size={8} color="#fff" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: 0.4 }}>{t("ambassador")}</span>
                  <span style={{ fontSize: 6, fontWeight: 600, color: "#E6EAF5", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ color: "#E11D26" }}>★</span>MATRÍCULA USA<span style={{ color: "#E11D26" }}>★</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Hero image — small, right side */}
            <div className="relative flex-shrink-0" style={{ width: 120, height: 160 }}>
              <img
                src="/embaixador-hero.png"
                alt="Embaixador Matrícula USA"
                style={{
                  position: "absolute", top: -8, right: -12,
                  height: "115%", width: "auto",
                  objectFit: "contain", objectPosition: "top right",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px rounded" style={{ background: "#E3E6EB" }} />
            <StarIcon size={8} color="#1B2E6B" />
            <StarIcon size={11} color="#2B5CC4" />
            <StarIcon size={8} color="#1B2E6B" />
            <div className="flex-1 h-px rounded" style={{ background: "#E3E6EB" }} />
          </div>
          {universityName && (
            <div className="flex items-center gap-3 mb-3 rounded-xl px-3 py-2" style={{ background: "#EEF3FF", border: "1px solid #2B5CC4", display: "inline-flex", alignSelf: "flex-start" }}>
              {universityLogo ? (
                <img src={universityLogo} alt={universityName} style={{ height: 24, width: "auto", maxWidth: 60, objectFit: "contain", borderRadius: 4 }} />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2B5CC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1B2E6B" }}>
                <strong>{universityName}</strong> participa do Programa de Embaixadores
              </span>
            </div>
          )}
          <p className="m-0 mb-2 leading-relaxed" style={{ fontSize: 13, color: "#1B2E6B" }}>
            Você acaba de ser convidado para fazer parte do{" "}
            <strong style={{ fontWeight: 700 }}>
              Programa de Embaixadores do Matrícula{" "}
              <span style={{ whiteSpace: "nowrap" }}>USA! <USFlag /></span>
            </strong>
          </p>
          <p className="m-0 leading-relaxed" style={{ fontSize: 13, color: "#1B2E6B" }}>
            Seu perfil chamou nossa atenção, e acreditamos que você pode inspirar outros estudantes que também sonham em estudar nos Estados Unidos.
          </p>
        </div>

        {/* ===== BENEFITS + CTA ===== */}
        <div className="px-5 pb-6 sm:px-8 sm:pb-7">
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#F3F4F6" }}>
            <p className="m-0 mb-3 sm:mb-4 text-center font-bold" style={{ fontSize: "clamp(11px, 2.5vw, 13px)", color: "#1B2E6B" }}>
              Como Embaixador, você poderá receber benefícios exclusivos, como:
            </p>

            {/* 2x2 on mobile, 4 cols on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {BENEFITS(universityName).map((b, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center"
                  style={{
                    padding: "0 10px",
                    // mobile 2x2: separadores laterais nas colunas ímpares, topo nas linhas inferiores
                    borderLeft: i === 1 || i === 3 ? "1px solid #E1E4EA" : undefined,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full mb-2 sm:mb-2.5"
                    style={{ width: 40, height: 40, background: b.bg }}
                  >
                    {b.icon}
                  </div>
                  <p className="m-0 leading-snug" style={{ fontSize: "clamp(10px, 2.2vw, 11px)", color: "#353B47" }}>
                    {b.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 my-3 sm:my-4">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2B5CC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 13V9" />
              <path d="M9 2h6" />
              <path d="M18 6l1.5-1.5" />
            </svg>
            <span className="font-bold" style={{ fontSize: "clamp(11px, 2.5vw, 12px)", color: "#2A2F3A" }}>
              Leva menos de 2 minutos para ativar sua participação.
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
            style={{
              border: "none", cursor: "pointer",
              background: "linear-gradient(180deg,#E8242C 0%,#D4161E 100%)",
              color: "#fff", fontFamily: "'Poppins', sans-serif",
              fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 700,
              padding: "14px 20px", borderRadius: 12,
              boxShadow: "0 10px 22px rgba(212,22,30,0.35)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
            Quero ser um Embaixador
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 transition-colors hover:text-slate-600"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9CA3AF", fontFamily: "'Poppins', sans-serif",
              fontSize: 11, padding: "5px 0",
            }}
          >
            Talvez depois
          </button>

        </div>
      </div>
    </div>
  );
};

export default MatriculaRewardsInvitePopup;
