import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../lib/supabase";
import { useStudentApplicationsQuery } from "../../../hooks/useStudentDashboardQueries";
import { StepProps } from "../types";

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

const BENEFIT_ICONS = [
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M22 9L12 5 2 9l10 4 10-4z" fill="#fff" />
    <path d="M6 11v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4" stroke="#fff" fill="none" strokeWidth="1.6" strokeLinecap="round" />
  </svg>,
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
    <path d="M15 8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2.5l5 3.5V7l-5 3.5V8z" />
  </svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 19c0-3 3.5-4.5 7-4.5s7 1.5 7 4.5v1H2v-1zm15.5-4c2.4.2 4.5 1.5 4.5 4v1h-4v-1c0-1.6-.6-2.9-1.6-3.8.4-.1.7-.2 1.1-.2z" />
  </svg>,
  null, // StarIcon — rendered inline
];
const BENEFIT_BGS = ["#E11D26", "#2B5CC4", "#E11D26", "#2B5CC4"];

export const AmbassadorProgramStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation("common");
  const { user, userProfile } = useAuth();
  const { data: applications } = useStudentApplicationsQuery(userProfile?.id);

  const selectedApp = applications?.find(
    (app: any) => app.id === userProfile?.selected_application_id
  ) || applications?.[0];
  const universityName = (selectedApp as any)?.scholarships?.universities?.name as string | undefined;
  const universityLogo = (selectedApp as any)?.scholarships?.universities?.logo_url as string | undefined;
  const courseName = (selectedApp as any)?.scholarships?.field_of_study as string | undefined;

  React.useEffect(() => {
    if (user?.id && !userProfile?.rewards_popup_shown_at) {
      supabase.from("user_profiles")
        .update({ rewards_popup_shown_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  }, [user?.id, userProfile?.rewards_popup_shown_at]);

  const handleAccept = async () => {
    localStorage.setItem("rewards_invite_popup_dismissed_at", String(Date.now() + 365 * 24 * 60 * 60 * 1000));
    window.open(
      "https://wa.me/12136762544?text=Tenho%20interesso%20em%20ser%20embaixador!%0ACheguei%20pelo%20site%20MatriculaUSA.",
      "_blank",
      "noopener,noreferrer"
    );
    const now = new Date().toISOString();
    if (user?.id) {
      const { error } = await supabase.from("user_profiles")
        .update({
          rewards_popup_shown_at: now,
          rewards_popup_accepted_at: now,
        })
        .eq("user_id", user.id);
      if (error) {
        console.error("Error updating rewards popup acceptance:", error);
      }
    }
    onNext();
  };

  return (
    <div className="w-full flex justify-center px-4 pb-10">
      <div
        className="w-full bg-white overflow-hidden"
        style={{
          maxWidth: 780,
          borderRadius: 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* ===== HERO DESKTOP ===== */}
        <div className="relative hidden sm:block px-8 pt-7 pb-5" style={{ overflow: "visible" }}>
          {/* Confetti right */}
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
            {/* LEFT */}
            <div className="relative z-10">
              <div className="flex items-start gap-3" style={{ paddingLeft: 0 }}>
                <span className="text-4xl leading-none">🎉</span>
                <h1 className="m-0 leading-none font-extrabold" style={{ fontSize: 38, color: "#1B2E6B", letterSpacing: -0.5 }}>
                  {t("ambassadorStep.congrats")}
                </h1>
              </div>
              <h2 className="mt-1.5 mb-0 font-extrabold leading-tight" style={{ fontSize: 26, color: "#E11D26", letterSpacing: -0.3 }}>
                {t("ambassadorStep.selected")}
              </h2>

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
                    {t("ambassadorStep.participates", { university: universityName })}
                  </span>
                </div>
              )}

              <p className="m-0 mb-2 leading-relaxed" style={{ fontSize: 15, color: "#1B2E6B" }}>
                {t("ambassadorStep.inviteIntro")}
                <strong style={{ fontWeight: 700 }}>
                  <span style={{ whiteSpace: "nowrap" }}>{t("ambassadorStep.programName")} <USFlag /></span>
                </strong>
              </p>
              <p className="m-0 leading-relaxed" style={{ fontSize: 15, color: "#1B2E6B" }}>
                {t("ambassadorStep.profileHook")}
              </p>
            </div>

            {/* RIGHT — imagem */}
            <div className="relative hidden sm:block" style={{ height: 280 }}>
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

        {/* ===== MOBILE ===== */}
        <div className="sm:hidden px-5 pt-4 pb-2">
          <div className="flex flex-col items-start gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="text-3xl leading-none">🎉</span>
                <h1 className="m-0 leading-none font-extrabold" style={{ fontSize: 26, color: "#1B2E6B", letterSpacing: -0.5 }}>
                  {t("ambassadorStep.congrats")}
                </h1>
              </div>
              <h2 className="mt-1 mb-0 font-extrabold leading-tight" style={{ fontSize: 18, color: "#E11D26", letterSpacing: -0.3 }}>
                {t("ambassadorStep.selected")}
              </h2>
              <div className="hidden" style={{
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

            <div className="relative mx-auto mt-1" style={{ width: 190, height: 205 }}>
              <img
                src="/embaixador-hero.png"
                alt="Embaixador Matrícula USA"
                style={{
                  position: "absolute",
                  top: -6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  height: "108%",
                  width: "auto",
                  objectFit: "contain",
                  objectPosition: "top center",
                }}
              />
              <div style={{
                position: "absolute",
                bottom: 4,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 5,
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "linear-gradient(160deg,#22397F 0%,#16285C 100%)",
                border: "1.5px solid #3A57A8",
                borderRadius: 10,
                padding: "6px 11px",
                boxShadow: "0 6px 16px rgba(15,28,70,0.36)",
                whiteSpace: "nowrap",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#2B5CC4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #fff" }}>
                  <StarIcon size={10} color="#fff" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.18, gap: 1 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", letterSpacing: 0.4 }}>
                    {t("ambassador")}
                  </span>
                  <span style={{ fontSize: 6.5, fontWeight: 600, color: "#E6EAF5", letterSpacing: 0.9, display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ color: "#E11D26" }}>â˜…</span>MATRÃCULA USA<span style={{ color: "#E11D26" }}>â˜…</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px rounded" style={{ background: "#E3E6EB" }} />
            <StarIcon size={8} color="#1B2E6B" />
            <StarIcon size={11} color="#2B5CC4" />
            <StarIcon size={8} color="#1B2E6B" />
            <div className="flex-1 h-px rounded" style={{ background: "#E3E6EB" }} />
          </div>

          {universityName && (
            <div className="flex items-center gap-2 mb-3 rounded-lg px-3 py-2" style={{ background: "#EEF3FF", border: "1px solid #2B5CC4" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2B5CC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1B2E6B" }}>
                {t("ambassadorStep.participates", { university: universityName })}
              </span>
            </div>
          )}

          <p className="m-0 mb-2 leading-relaxed" style={{ fontSize: 13, color: "#1B2E6B" }}>
            {t("ambassadorStep.inviteIntro")}
            <strong style={{ fontWeight: 700 }}>
              <span style={{ whiteSpace: "nowrap" }}>{t("ambassadorStep.programName")} <USFlag /></span>
            </strong>
          </p>
          <p className="m-0 leading-relaxed" style={{ fontSize: 13, color: "#1B2E6B" }}>
            {t("ambassadorStep.profileHook")}
          </p>
        </div>

        {/* ===== BENEFITS + CTA ===== */}
        <div className="px-5 pb-6 sm:px-8 sm:pb-7">
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#F3F4F6" }}>
            <p className="m-0 mb-3 sm:mb-4 text-center font-bold" style={{ fontSize: "clamp(11px, 2.5vw, 13px)", color: "#1B2E6B" }}>
              {t("ambassadorStep.benefitsTitle")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {([
                universityName ? t("ambassadorStep.benefit1", { university: universityName }) : t("ambassadorStep.benefit1Generic"),
                t("ambassadorStep.benefit2"),
                t("ambassadorStep.benefit3"),
                t("ambassadorStep.benefit4"),
              ] as string[]).map((label, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center"
                  style={{
                    padding: "0 10px",
                    borderLeft: i === 1 || i === 3 ? "1px solid #E1E4EA" : undefined,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full mb-2 sm:mb-2.5"
                    style={{ width: 40, height: 40, background: BENEFIT_BGS[i] }}
                  >
                    {i === 3 ? <StarIcon size={22} color="#fff" /> : BENEFIT_ICONS[i]}
                  </div>
                  <p className="m-0 leading-snug" style={{ fontSize: "clamp(10px, 2.2vw, 11px)", color: "#353B47" }}>
                    {label}
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
              {t("ambassadorStep.timer")}
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={handleAccept}
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
            {t("ambassadorStep.cta")}
          </button>

          <button
            onClick={async () => {
              if (user?.id) {
                const { error } = await supabase.from("user_profiles")
                  .update({ rewards_popup_shown_at: new Date().toISOString() })
                  .eq("user_id", user.id);
                if (error) {
                  console.error("Error updating rewards popup shown status:", error);
                }
              }
              onNext();
            }}
            className="w-full mt-2 transition-colors hover:text-slate-600"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9CA3AF", fontFamily: "'Poppins', sans-serif",
              fontSize: 11, padding: "5px 0",
            }}
          >
            {t("ambassadorStep.skip")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorProgramStep;
