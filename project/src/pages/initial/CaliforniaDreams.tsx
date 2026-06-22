import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowRight,
  ArrowUpRight,
  Phone,
  Check,
  Languages,
  GraduationCap,
  Globe2,
  Users,
  Sparkles,
  Compass,
  Briefcase,
  Calendar,
  Quote,
  Camera,
  Video,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import heroImg from "@/assets/caroline/hero-students.jpg";
import airportImg from "@/assets/caroline/airport-departure.jpg";
import skylineImg from "@/assets/caroline/hero-la-skyline.jpg";
import campusImg from "@/assets/caroline/campus-students.jpg";
import laImg from "@/assets/caroline/la-downtown.jpg";
import Carousel from "@/components/ui/Carousel";
import "@/california-landing.css";

/* -------------------------------------------------------------------------- */
/*  Configuração                                                              */
/* -------------------------------------------------------------------------- */

// TODO: substituir pelo número real do consultor antes de publicar.
const WHATSAPP_NUMBER = "12136762544";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// Revela o elemento com fade-in quando entra na viewport.
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("cu-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// Placeholder de mídia (foto/vídeo) a ser substituído por conteúdo real.
function PhotoSlot({
  id,
  hint,
  kind = "photo",
  className = "",
  aspect = "4/5",
}: {
  id: string;
  hint?: string;
  kind?: "photo" | "video";
  className?: string;
  aspect?: string;
}) {
  const label = kind === "video" ? `VIDEO DEPOIMENTO ${id}` : `UPLOAD FOTO REAL ${id}`;
  const Icon = kind === "video" ? Video : Camera;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-[var(--cu-gold)]/40 bg-[var(--cu-navy)]/5 ${className}`}
      style={{ aspectRatio: aspect }}
      data-photo-slot={id}
    >
      <div className="absolute inset-0 cu-navy-gradient opacity-90" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--cu-gold)]/40 text-[var(--cu-gold)]">
          <Icon className="h-5 w-5" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--cu-gold-soft)]">[{label}]</p>
        {hint ? <p className="text-sm text-white/70 max-w-[22ch]">{hint}</p> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dados                                                                     */
/* -------------------------------------------------------------------------- */

type ProgramId = "mission" | "entrepreneur" | "music";

const programLabels: Record<ProgramId, string> = {
  mission: "Missão Califórnia",
  entrepreneur: "Empreendedor Global",
  music: "International Music Career",
};

const programs: {
  id: ProgramId;
  tag: string;
  title: string;
  emotional: string;
  full: string;
  benefits: string[];
}[] = [
  {
    id: "mission",
    tag: "Liderança & Propósito",
    title: "Missão Califórnia",
    emotional:
      "Imagine viver uma experiência de crescimento espiritual, liderança e impacto social enquanto estuda nos Estados Unidos.",
    full:
      "Um programa para quem quer formar caráter e propósito enquanto cresce como líder. Você vivencia projetos sociais, mentoria espiritual e desenvolvimento pessoal em uma das comunidades mais inspiradoras dos EUA — preparado para liderar em qualquer lugar do mundo.",
    benefits: ["Liderança", "Desenvolvimento pessoal", "Projetos comunitários", "Networking cristão"],
  },
  {
    id: "entrepreneur",
    tag: "Negócios & Inovação",
    title: "Empreendedor Global",
    emotional:
      "Imagine estudar na Califórnia enquanto aprende sobre negócios, inovação, inteligência artificial e empreendedorismo.",
    full:
      "Desenhado para quem quer construir negócios escaláveis. Imersão em IA, marketing digital, modelos de negócios e mentalidade global — com acesso ao ecossistema empreendedor mais vivo do planeta. Você sai pronto para empreender em qualquer mercado.",
    benefits: ["Negócios internacionais", "Inteligência Artificial", "Marketing Digital", "Networking empresarial"],
  },
  {
    id: "music",
    tag: "Arte & Carreira Internacional",
    title: "International Music Career",
    emotional:
      "Imagine desenvolver sua arte em um dos ambientes mais influentes do mundo para música e entretenimento.",
    full:
      "Para artistas que querem profissionalizar sua carreira no maior polo da indústria musical mundial. Você desenvolve marca pessoal, produção, presença de palco e estratégia internacional — conectado a profissionais que moldam a cultura pop global.",
    benefits: ["Marca pessoal", "Carreira internacional", "Produção musical", "Networking artístico"],
  },
];

const futureItems = [
  { icon: Languages, title: "Fluência em inglês", text: "Imersão diária num ambiente 100% americano." },
  { icon: GraduationCap, title: "Diploma americano", text: "Reconhecimento internacional para sua carreira." },
  { icon: Globe2, title: "Experiência internacional", text: "Vivência cultural que muda quem você é." },
  { icon: Users, title: "Rede global de contatos", text: "Amigos e mentores em todos os continentes." },
  { icon: Sparkles, title: "Crescimento pessoal", text: "Maturidade, autoconhecimento e propósito." },
  { icon: Compass, title: "Independência", text: "Aprenda a viver, decidir e construir o seu caminho." },
  { icon: Briefcase, title: "Desenvolvimento profissional", text: "Skills do mercado global desde o primeiro semestre." },
];

const losAngelesSlides = [
  { title: "Hollywood Sign", src: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=80" },
  { title: "Santa Monica Pier", src: "https://images.unsplash.com/photo-1505887579242-c7bc04062e98?auto=format&fit=crop&w=1200&q=80" },
  { title: "Griffith Observatory", src: "https://images.unsplash.com/photo-1546624356-62f238e38e2a?auto=format&fit=crop&w=1200&q=80" },
  { title: "Ruas de palmeiras", src: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?auto=format&fit=crop&w=1200&q=80" },
  { title: "Downtown Los Angeles", src: "https://images.unsplash.com/photo-1544413660-299165566b1d?auto=format&fit=crop&w=1200&q=80" },
  { title: "Los Angeles à noite", src: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80" },
  { title: "Downtown Los Angeles", src: laImg },
];

const californiaPillars = [
  { k: "01", t: "Inovação & Tecnologia", d: "Do Vale do Silício a startups locais — você respira o futuro." },
  { k: "02", t: "Diversidade cultural", d: "Mais de 140 nacionalidades coexistindo em uma única cidade." },
  { k: "03", t: "Empreendedorismo", d: "Mindset de criar, testar e escalar — desde o primeiro dia." },
  { k: "04", t: "Música & Entretenimento", d: "Capital global da indústria criativa e da cultura pop." },
  { k: "05", t: "Oportunidades globais", d: "Networking que abre portas em qualquer lugar do mundo." },
];

const moments = [
  "Embarcando para os Estados Unidos",
  "Conhecendo novas culturas e formas de pensar",
  "Fazendo amizades para a vida em outros países",
  "Crescendo como pessoa, longe da zona de conforto",
  "Descobrindo, finalmente, o seu propósito",
];

const testimonials = [
  { id: "01", name: "Ana Carolina", program: "Empreendedor Global", quote: "Em 6 meses eu tinha um inglês fluente, três amigos de continentes diferentes e a primeira ideia de negócio.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face" },
  { id: "02", name: "Lucas Andrade", program: "Missão Califórnia", quote: "Eu vim buscar diploma e voltei com propósito. A experiência redefiniu o tipo de pessoa que eu quero ser.", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face" },
  { id: "03", name: "Mariana Costa", program: "International Music Career", quote: "Cantei no estúdio dos meus sonhos. A Califórnia me deu palco, mentores e visão de carreira internacional.", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face" },
];

const months = [
  { m: "Janeiro", d: "Comece o ano com uma nova vida." },
  { m: "Maio", d: "Inicie sua jornada no meio do ano letivo." },
  { m: "Agosto", d: "Entre direto no calendário americano." },
];

const quizQuestions: { q: string; options: { label: string; w: Partial<Record<ProgramId, number>> }[] }[] = [
  {
    q: "Quando você imagina seu futuro, o que mais te move?",
    options: [
      { label: "Liderar pessoas e gerar impacto", w: { mission: 2, entrepreneur: 1 } },
      { label: "Criar negócios e produtos", w: { entrepreneur: 2 } },
      { label: "Expressar arte e influenciar pela criatividade", w: { music: 2 } },
    ],
  },
  {
    q: "Como você gosta de passar uma sexta à noite?",
    options: [
      { label: "Em comunidade, conversas profundas", w: { mission: 2 } },
      { label: "Trocando ideias sobre projetos e tecnologia", w: { entrepreneur: 2 } },
      { label: "Em shows, estúdios ou criando conteúdo", w: { music: 2 } },
    ],
  },
  {
    q: "Qual habilidade você quer dominar nos próximos 4 anos?",
    options: [
      { label: "Liderança e propósito pessoal", w: { mission: 2 } },
      { label: "Estratégia, IA e marketing digital", w: { entrepreneur: 2 } },
      { label: "Marca pessoal e carreira artística internacional", w: { music: 2 } },
    ],
  },
  {
    q: "Quem você admira hoje?",
    options: [
      { label: "Líderes que mudam vidas e comunidades", w: { mission: 2 } },
      { label: "Fundadores de empresas globais", w: { entrepreneur: 2 } },
      { label: "Artistas que rompem fronteiras", w: { music: 2 } },
    ],
  },
  {
    q: "Daqui a 10 anos, onde você quer estar?",
    options: [
      { label: "Liderando um projeto de impacto social ou cristão", w: { mission: 2 } },
      { label: "Tocando uma empresa internacional ou startup", w: { entrepreneur: 2 } },
      { label: "Vivendo da minha arte em mercados globais", w: { music: 2 } },
    ],
  },
];

const degrees = [
  { level: "Bacharelado", name: "Business Administration" },
  { level: "Bacharelado", name: "Arts in Biblical Studies" },
  { level: "Bacharelado", name: "Music" },
  { level: "Mestrado", name: "Divinity" },
  { level: "Mestrado", name: "Business Administration" },
  { level: "Mestrado", name: "Computer Science" },
  { level: "Mestrado", name: "Philosophy" },
];

/* -------------------------------------------------------------------------- */
/*  Seções                                                                    */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[var(--cu-ink)] text-white">
      <img
        src={heroImg}
        alt="Estudantes internacionais felizes caminhando juntos em um campus universitário na Califórnia ao pôr do sol"
        width={1920}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png.png" alt="Matrícula USA" className="h-10 w-auto rounded-full bg-white p-1" />
        </div>
        <nav className="hidden items-center gap-6 text-base font-medium text-white/85 md:flex">
          <a href="#programas" className="hover:text-white">Programas</a>
          <a href="#quiz" className="hover:text-white">Quiz</a>
          <a href="#contato" className="hover:text-white">Contato</a>
          <a
            href="#contato"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-base font-semibold text-[var(--cu-ink)] transition hover:bg-[var(--cu-sun)] hover:text-white"
          >
            <Phone className="h-4 w-4" />
            Falar com consultor
          </a>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-6 pb-20 pt-20 sm:px-10 sm:pb-24 lg:min-h-[78svh]">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cu-sun)]" />
            Turmas 2026 · Inscrições abertas
          </span>
          <h1 className="cu-display mt-6 text-center text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.95] sm:text-left">
            Não existe limite<br />
            para até onde<br />
            <span className="text-[var(--cu-sun)]">você pode chegar.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-center text-xl font-medium text-white/85 sm:mx-0 sm:text-left sm:text-2xl">
            Estude na Califórnia através de programas exclusivos da MatrículaUSA. Idiomas, intercâmbio cultural e graduação nos Estados Unidos.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <a
              href="#programas"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--cu-sun)] px-7 py-4 text-base font-bold uppercase tracking-[0.12em] text-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] transition hover:translate-y-[-2px] hover:bg-[var(--cu-sun-deep)]"
            >
              Conheça os programas
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </a>
            <a
              href="#quiz"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white hover:text-[var(--cu-ink)]"
            >
              Qual programa combina com você?
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/15 bg-black/30 backdrop-blur-sm">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-4 px-6 py-5 text-white sm:grid-cols-4 sm:px-10">
          {[
            ["Localização", "Califórnia, EUA"],
            ["Idade", "17 — 22 anos"],
            ["Início", "Jan · Mai · Ago"],
            ["Idioma", "Português + Inglês"],
          ].map(([k, v]) => (
            <div key={k} className="text-center sm:text-left">
              <dt className="text-xs uppercase tracking-[0.22em] text-white/55">{k}</dt>
              <dd className="cu-display mt-1 text-lg sm:text-xl">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FutureVision() {
  const ref = useReveal<HTMLDivElement>();

  const bentoSpans = [
    "sm:col-span-2 lg:col-span-2",
    "",
    "",
    "",
    "",
    "sm:col-span-2 lg:col-span-2",
    "",
  ];

  return (
    <section className="relative bg-[var(--cu-cream)] py-24 sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-6xl px-6 text-center sm:px-10 sm:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-deep)]">Sua vida em 4 anos</p>
        <h2 className="cu-display mt-4 mx-auto max-w-3xl text-[clamp(2rem,5vw,3.75rem)] font-medium leading-[1.05] text-[var(--cu-ink)] sm:mx-0">
          Imagine quem você será depois de viver isso.
        </h2>
        <p className="mt-5 mx-auto max-w-2xl text-xl text-[var(--cu-muted)] sm:mx-0">
          Não é só um diploma. É uma versão sua mais confiante, mais conectada e pronta para um mundo sem fronteiras.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {futureItems.map((it, i) => {
            const isHero = i === 0;
            return (
              <div
                key={it.title}
                className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1 ${bentoSpans[i]} ${
                  isHero
                    ? "cu-navy-gradient text-white cu-shadow-premium"
                    : "bg-white text-[var(--cu-ink)] cu-shadow-card hover:cu-shadow-premium"
                }`}
              >
                {isHero && (
                  <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--cu-gold)]/15 blur-3xl" />
                )}

                <div className="relative flex flex-col items-center gap-4 sm:items-start">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
                      isHero
                        ? "cu-gold-gradient text-[var(--cu-navy-deep)]"
                        : "border border-[var(--cu-gold)]/50 text-[var(--cu-gold-deep)] group-hover:cu-gold-gradient group-hover:text-[var(--cu-navy-deep)] group-hover:border-transparent"
                    }`}
                  >
                    <it.icon className="h-5 w-5" />
                  </div>
                  <h3
                    className={`cu-display font-semibold ${
                      isHero ? "text-3xl lg:text-4xl" : "text-2xl"
                    }`}
                  >
                    {it.title}
                  </h3>
                  <p className={`text-base leading-relaxed ${isHero ? "text-white/70 max-w-sm" : "text-[var(--cu-muted)]"}`}>
                    {it.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhyCalifornia() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative overflow-hidden bg-[var(--cu-navy-deep)] py-24 text-white sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto grid max-w-7xl gap-16 px-6 sm:px-10 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <Carousel slides={losAngelesSlides} showControls={false} />
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-center text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-soft)] sm:text-left">Por que aqui?</p>
          <h2 className="cu-display mt-4 text-center text-[clamp(2rem,4.5vw,3.5rem)] font-medium leading-[1.05] sm:text-left">
            A Califórnia não é um destino.<br /><span className="cu-text-gold-gradient italic">É um ecossistema.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-center text-lg text-white/70 sm:mx-0 sm:text-left">
            É onde ideias viram empresas, sonhos viram carreira e estudantes viram cidadãos do mundo. Estudar aqui é entrar para uma rede que move o planeta.
          </p>

          <ul className="mt-10 space-y-5">
            {californiaPillars.map((p) => (
              <li key={p.k} className="flex gap-5 border-b border-white/10 pb-5 last:border-0">
                <span className="cu-display text-[var(--cu-gold)] text-xl">{p.k}</span>
                <div>
                  <p className="cu-display text-xl font-semibold">{p.t}</p>
                  <p className="mt-1 text-base text-white/65">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ProgramsCards({ onPick }: { onPick?: (id: ProgramId) => void }) {
  const [open, setOpen] = useState<ProgramId | null>(null);
  const ref = useReveal<HTMLDivElement>();

  return (
    <section id="programas" className="relative bg-[var(--cu-cream)] py-24 sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-deep)]">Escolha sua jornada</p>
          <h2 className="cu-display mt-4 text-[clamp(2rem,5vw,3.75rem)] font-medium leading-[1.05] text-[var(--cu-ink)]">
            Três caminhos.<br /><span className="cu-text-gold-gradient italic">Uma transformação.</span>
          </h2>
          <p className="mt-5 text-xl text-[var(--cu-muted)]">
            Cada programa foi desenhado para um perfil. Escolha o que ressoa com quem você quer se tornar.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {programs.map((p) => (
            <article
              key={p.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-white p-8 cu-shadow-card transition hover:-translate-y-1 hover:cu-shadow-premium"
            >
              <div className="absolute inset-x-0 top-0 h-1 cu-gold-gradient opacity-60" />
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--cu-gold-deep)]">{p.tag}</p>
                <h3 className="cu-display mt-3 text-4xl font-medium text-[var(--cu-ink)]">{p.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-[var(--cu-muted)]">{p.emotional}</p>
              </div>

              <ul className="mt-6 space-y-2.5">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-center justify-center gap-2.5 text-base text-[var(--cu-ink)] sm:justify-start">
                    <Check className="h-4 w-4 shrink-0 text-[var(--cu-gold-deep)]" /> {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <div className="flex items-end justify-between border-t border-[var(--cu-ink)]/10 pt-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--cu-muted)]">Investimento total</p>
                    <p className="cu-display text-3xl font-semibold text-[var(--cu-ink)]">US$ 15.000</p>
                  </div>
                  <Dialog open={open === p.id} onOpenChange={(v) => setOpen(v ? p.id : null)}>
                    <DialogTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--cu-navy)] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[var(--cu-navy-deep)]">
                        Saiba mais <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90svh] flex flex-col overflow-hidden p-0">
                      <div className="flex-1 min-h-0 overflow-y-auto p-6" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
                        <DialogHeader>
                          <p className="text-xs uppercase tracking-[0.25em] text-[var(--cu-gold-deep)]">{p.tag}</p>
                          <DialogTitle className="cu-display text-4xl font-medium text-[var(--cu-ink)]">{p.title}</DialogTitle>
                          <DialogDescription className="pt-2 text-base leading-relaxed text-[var(--cu-muted)]">
                            {p.full}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--cu-muted)]">Benefícios</p>
                          <ul className="mt-3 grid grid-cols-2 gap-2">
                            {p.benefits.map((b) => (
                              <li key={b} className="flex items-center gap-2 text-base text-[var(--cu-ink)]">
                                <Check className="h-4 w-4 text-[var(--cu-gold-deep)]" /> {b}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-6 rounded-xl bg-[var(--cu-cream)] p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase tracking-[0.2em] text-[var(--cu-muted)]">Tuition anual</span>
                              <span className="cu-display text-3xl font-semibold text-[var(--cu-ink)]">US$ 15.000<span className="text-sm font-normal text-[var(--cu-muted)]">/ano</span></span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setOpen(null);
                              onPick?.(p.id);
                              document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="mt-6 w-full rounded-full cu-gold-gradient px-6 py-3.5 text-base font-semibold uppercase tracking-[0.15em] text-[var(--cu-navy-deep)] cu-shadow-gold"
                          >
                            Quero este programa
                          </button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-deep)]">Próximas turmas</p>
          <p className="mt-2 text-base text-[var(--cu-muted)]">Três entradas por ano — escolha a que encaixa no seu momento.</p>
          <div className="mt-5 grid gap-5 text-left sm:grid-cols-3">
            {months.map((it) => (
              <div key={it.m} className="group rounded-2xl border border-[var(--cu-ink)]/10 bg-white p-7 text-center transition hover:cu-shadow-card hover:-translate-y-1 sm:text-left">
                <Calendar className="mx-auto h-5 w-5 text-[var(--cu-gold-deep)] sm:mx-0" />
                <p className="cu-display mt-4 text-4xl font-medium text-[var(--cu-ink)]">{it.m}</p>
                <p className="mt-2 text-base text-[var(--cu-muted)]">{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsIncluded() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="bg-[var(--cu-cream)] py-24 sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-6xl px-6 sm:px-10">
        <div className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-deep)]">O que está incluído</p>
          <h2 className="cu-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.05] text-[var(--cu-ink)]">
            Transparência Total. <span className="cu-text-gold-gradient italic">Zero Surpresas.</span>
          </h2>
        </div>

        <div className="mt-14">
          <div className="rounded-3xl bg-white p-8 cu-shadow-card sm:p-10">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--cu-muted)]">Composição do investimento</p>
            <div className="mt-6 space-y-5">
              <div className="flex flex-col border-b border-[var(--cu-ink)]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="cu-display text-2xl font-medium text-[var(--cu-ink)]">Custo anual do programa</p>
                  <p className="text-base text-[var(--cu-muted)]">Investimento anual completo</p>
                </div>
                <p className="cu-display mt-2 text-3xl font-semibold text-[var(--cu-ink)] sm:mt-0">US$ 10.000</p>
              </div>
              <div className="flex flex-col border-b border-[var(--cu-ink)]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="cu-display text-2xl font-medium text-[var(--cu-ink)]">Admissão Premium</p>
                  <p className="text-base text-[var(--cu-muted)]">Admissão escolar</p>
                </div>
                <p className="cu-display mt-2 text-3xl font-semibold text-[var(--cu-ink)] sm:mt-0">US$ 5.000</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-[var(--cu-ink)] p-6 text-white sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Investimento total</p>
                <p className="cu-display text-4xl font-semibold">US$ 15.000</p>
              </div>
              <div className="sm:text-right">
                <span className="rounded-full bg-[var(--cu-gold-deep)] px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.15em] text-white">
                  Por apenas
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function EmotionalValue() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative overflow-hidden bg-[var(--cu-navy-deep)] py-28 text-white sm:py-40">
      <div className="absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-[var(--cu-gold)]/15 blur-3xl" />
      <div className="absolute -bottom-40 left-0 h-[420px] w-[420px] rounded-full bg-[var(--cu-navy-soft)]/40 blur-3xl" />

      <div ref={ref} className="cu-fade-in relative mx-auto max-w-4xl px-6 text-center sm:px-10">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-soft)]">A pergunta certa</p>
        <h2 className="cu-display mt-6 text-[clamp(2.2rem,5.5vw,4.25rem)] font-medium leading-[1.05]">
          Quanto vale uma decisão que pode <span className="cu-text-gold-gradient italic">mudar sua vida</span>?
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-white/75">
          Pense daqui a dez anos. O profissional que você quer ser, a carreira que sonha construir, as pessoas que pretende impactar.
          Quase tudo isso começa numa única decisão — feita agora, no momento certo.
        </p>
        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl cu-shadow-premium">
          <img
            src={skylineImg}
            alt="Skyline de Los Angeles"
            width={1600}
            height={1000}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <p className="cu-display mt-10 text-3xl italic text-[var(--cu-gold-soft)]">
          "Os anos passam de qualquer jeito. A pergunta é onde você quer estar quando eles passarem."
        </p>
      </div>
    </section>
  );
}

function IfItWereYou() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="bg-[var(--cu-cream)] py-24 sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <div className="relative overflow-hidden rounded-3xl cu-shadow-premium">
              <img
                src={airportImg}
                alt="Estudante embarcando para os Estados Unidos no aeroporto"
                width={1800}
                height={1100}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                <p className="cu-display text-3xl font-medium text-white sm:text-4xl">
                  O primeiro voo internacional da sua vida.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl cu-shadow-premium">
              <img
                src={campusImg}
                alt="Estudantes no campus"
                width={1600}
                height={1000}
                loading="lazy"
                className="aspect-[16/10] h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-center text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-deep)] sm:text-left">Imagine por um instante</p>
            <h2 className="cu-display mt-4 text-center text-[clamp(2rem,5vw,3.75rem)] font-medium leading-[1.05] text-[var(--cu-ink)] sm:text-left">
              E se fosse <span className="cu-text-gold-gradient italic">você</span>?
            </h2>

          <ul className="mt-8 space-y-5">
            {moments.map((m, i) => (
              <li key={m} className="flex items-start gap-4">
                <span className="cu-display mt-1 text-base font-semibold text-[var(--cu-gold-deep)]">0{i + 1}</span>
                <p className="cu-display text-2xl text-[var(--cu-ink)] sm:text-3xl">{m}</p>
              </li>
            ))}
          </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative bg-[var(--cu-navy-deep)] py-24 text-white sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:items-start sm:flex-row sm:items-end">
          <div className="max-w-xl text-center sm:text-left">
            <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-soft)]">Quem já viveu</p>
            <h2 className="cu-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.05]">
              Histórias reais de quem <span className="cu-text-gold-gradient italic">deu o passo</span>.
            </h2>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} className="flex h-full flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur">
              <div className="flex items-center gap-4">
                <img src={t.photo} alt={t.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-[var(--cu-gold)]/40" />
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm uppercase tracking-[0.18em] text-white/50">{t.program}</p>
                </div>
              </div>
              <Quote className="h-6 w-6 text-[var(--cu-gold)]" />
              <p className="cu-display text-xl leading-snug">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function ProfileQuiz({ onResult }: { onResult: (id: ProgramId) => void }) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState<Record<ProgramId, number>>({ mission: 0, entrepreneur: 0, music: 0 });
  const [done, setDone] = useState<ProgramId | null>(null);
  const ref = useReveal<HTMLDivElement>();

  const pick = (w: Partial<Record<ProgramId, number>>) => {
    const next = { ...score };
    (Object.keys(w) as ProgramId[]).forEach((k) => (next[k] += w[k] ?? 0));
    setScore(next);
    if (step + 1 >= quizQuestions.length) {
      const winner = (Object.keys(next) as ProgramId[]).reduce((a, b) => (next[a] >= next[b] ? a : b));
      setDone(winner);
    } else {
      setStep(step + 1);
    }
  };

  const reset = () => {
    setStep(0);
    setScore({ mission: 0, entrepreneur: 0, music: 0 });
    setDone(null);
  };

  const progress = done ? 100 : (step / quizQuestions.length) * 100;

  return (
    <section id="quiz" className="bg-[var(--cu-cream)] py-24 sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-3xl px-6 sm:px-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--cu-gold)]/40 bg-white px-4 py-1.5 text-sm uppercase tracking-[0.25em] text-[var(--cu-gold-deep)]">
            <Sparkles className="h-4 w-4" /> Quiz de 60 segundos
          </span>
          <h2 className="cu-display mt-5 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.05] text-[var(--cu-ink)]">
            Qual programa <span className="cu-text-gold-gradient italic">combina mais com você?</span>
          </h2>
          <p className="mt-3 text-lg text-[var(--cu-muted)]">5 perguntas. Resposta personalizada no final.</p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl bg-white cu-shadow-card">
          <div className="h-1.5 bg-[var(--cu-ink)]/5">
            <div className="h-full cu-gold-gradient transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-7 sm:p-10">
            {!done ? (
              <>
                <p className="text-center text-xs uppercase tracking-[0.22em] text-[var(--cu-muted)] sm:text-left">
                  Pergunta {step + 1} de {quizQuestions.length}
                </p>
                <h3 className="cu-display mt-3 text-center text-3xl font-medium text-[var(--cu-ink)] sm:text-left sm:text-4xl">
                  {quizQuestions[step].q}
                </h3>
                <div className="mt-7 space-y-3">
                  {quizQuestions[step].options.map((o) => (
                    <button
                      key={o.label}
                      onClick={() => pick(o.w)}
                      className="group flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--cu-ink)]/10 bg-white px-5 py-4 text-left text-base text-[var(--cu-ink)] transition hover:border-[var(--cu-gold)] hover:bg-[var(--cu-cream)]"
                    >
                      <span>{o.label}</span>
                      <ArrowRight className="h-4 w-4 text-[var(--cu-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--cu-gold-deep)]" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--cu-gold-deep)]">Seu match</p>
                <h3 className="cu-display mt-3 text-5xl font-medium text-[var(--cu-ink)] sm:text-6xl">
                  {programLabels[done]}
                </h3>
                <p className="mx-auto mt-4 max-w-md text-lg text-[var(--cu-muted)]">
                  Pelas suas respostas, este é o programa com maior afinidade com o seu perfil. Fale com um consultor para entender os próximos passos.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => {
                      onResult(done);
                      document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-full cu-gold-gradient px-6 py-3.5 text-base font-semibold uppercase tracking-[0.15em] text-[var(--cu-navy-deep)] cu-shadow-gold"
                  >
                    Falar com um consultor
                  </button>
                  <button onClick={reset} className="inline-flex items-center gap-2 text-base text-[var(--cu-muted)] hover:text-[var(--cu-ink)]">
                    <RotateCcw className="h-4 w-4" /> Refazer o quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function UniversityPrograms() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative overflow-hidden bg-[var(--cu-navy-deep)] py-24 text-white sm:py-32">
      <div ref={ref} className="cu-fade-in mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-soft)]">Programas Acadêmicos</p>
          <h2 className="cu-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.05]">
            Escolha o seu grau.<br /><span className="cu-text-gold-gradient italic">A decisão é sua.</span>
          </h2>
          <p className="mt-5 text-xl text-white/70">
            Todos os pacotes incluem acesso a qualquer um desses programas universitários — você escolhe o que mais combina com seus objetivos.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {degrees.map((d, i) => (
            <div
              key={`${d.level}-${d.name}`}
              className={`flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.08] ${i === degrees.length - 1 ? "sm:col-start-1 lg:col-start-2" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full cu-gold-gradient">
                <GraduationCap className="h-5 w-5 text-[var(--cu-navy-deep)]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">{d.level}</p>
                <p className="cu-display mt-1 text-lg font-medium">{d.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(120),
  idade: z.string().trim().regex(/^\d{1,2}$/, "Idade inválida"),
  cidade: z.string().trim().min(2, "Informe sua cidade").max(60),
  programa: z.enum(["mission", "entrepreneur", "music", "indecided"]),
});

type LeadFormState = z.infer<typeof leadSchema>;

function LeadForm({ preselected }: { preselected: ProgramId | null }) {
  const [form, setForm] = useState<LeadFormState>({
    nome: "",
    whatsapp: "",
    email: "",
    idade: "",
    cidade: "",
    programa: preselected ?? "indecided",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormState, string>>>({});
  const ref = useReveal<HTMLDivElement>();

  useEffect(() => {
    if (preselected) setForm((f) => ({ ...f, programa: preselected }));
  }, [preselected]);

  const update = <K extends keyof LeadFormState>(k: K, v: LeadFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const buildMessage = (d: LeadFormState) => {
    const programa = d.programa === "indecided" ? "Ainda não decidi" : programLabels[d.programa];
    return [
      "Olá! Tenho interesse nos programas da MatrículaUSA.",
      "",
      `Nome: ${d.nome}`,
      `WhatsApp: ${d.whatsapp}`,
      `E-mail: ${d.email}`,
      `Idade: ${d.idade}`,
      `Cidade: ${d.cidade}`,
      `Programa de interesse: ${programa}`,
    ].join("\n");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof LeadFormState, string>> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof LeadFormState;
        errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    const msg = encodeURIComponent(buildMessage(parsed.data));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const fieldCls =
    "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/40 focus:border-[var(--cu-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--cu-gold)]/30 transition";

  return (
    <section id="contato" className="relative overflow-hidden cu-navy-gradient py-24 text-white sm:py-32">
      <div className="absolute -top-32 right-10 h-96 w-96 rounded-full bg-[var(--cu-gold)]/15 blur-3xl" />
      <div ref={ref} className="cu-fade-in relative mx-auto grid max-w-7xl gap-14 px-6 sm:px-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--cu-gold-soft)]">Próximo passo</p>
          <h2 className="cu-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.05]">
            Sua jornada internacional pode <span className="cu-text-gold-gradient italic">começar agora</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/70 sm:mx-0">
            Preencha o formulário e um consultor especialista entra em contato pelo WhatsApp para entender seu momento e mostrar os caminhos possíveis.
          </p>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero falar com um consultor sobre os programas da MatrículaUSA.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--cu-gold)]/40 bg-white/5 px-6 py-3.5 text-base font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4 text-[var(--cu-gold)]" /> Falar agora no WhatsApp
          </a>
        </div>

        <form onSubmit={submit} noValidate className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur sm:p-10">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">Nome completo</label>
              <input className={`mt-2 ${fieldCls}`} value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Seu nome" />
              {errors.nome && <p className="mt-1 text-sm text-[var(--cu-red)]">{errors.nome}</p>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">WhatsApp</label>
              <input className={`mt-2 ${fieldCls}`} value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" />
              {errors.whatsapp && <p className="mt-1 text-sm text-[var(--cu-red)]">{errors.whatsapp}</p>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">E-mail</label>
              <input className={`mt-2 ${fieldCls}`} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="voce@email.com" inputMode="email" />
              {errors.email && <p className="mt-1 text-sm text-[var(--cu-red)]">{errors.email}</p>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">Idade</label>
              <input className={`mt-2 ${fieldCls}`} value={form.idade} onChange={(e) => update("idade", e.target.value)} placeholder="18" inputMode="numeric" maxLength={2} />
              {errors.idade && <p className="mt-1 text-sm text-[var(--cu-red)]">{errors.idade}</p>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">Cidade</label>
              <input className={`mt-2 ${fieldCls}`} value={form.cidade} onChange={(e) => update("cidade", e.target.value)} placeholder="São Paulo" />
              {errors.cidade && <p className="mt-1 text-sm text-[var(--cu-red)]">{errors.cidade}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">Programa de interesse</label>
              <select
                className={`mt-2 ${fieldCls}`}
                value={form.programa}
                onChange={(e) => update("programa", e.target.value as LeadFormState["programa"])}
              >
                <option value="indecided" className="bg-[var(--cu-navy-deep)]">Ainda não decidi</option>
                <option value="mission" className="bg-[var(--cu-navy-deep)]">Missão Califórnia</option>
                <option value="entrepreneur" className="bg-[var(--cu-navy-deep)]">Empreendedor Global</option>
                <option value="music" className="bg-[var(--cu-navy-deep)]">International Music Career</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full cu-gold-gradient px-7 py-4 text-base font-semibold uppercase tracking-[0.18em] text-[var(--cu-navy-deep)] cu-shadow-gold transition hover:translate-y-[-2px]"
          >
            Falar com um consultor
          </button>
          <p className="mt-3 text-center text-xs text-white/50">Seus dados são tratados com confidencialidade.</p>
        </form>
      </div>
    </section>
  );
}


function Footer() {
  return (
    <footer className="bg-[var(--cu-navy-deep)] py-12 text-white/60">
      <p className="text-center text-sm">© 2026 MatrículaUSA. Todos os direitos reservados.</p>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Página                                                                    */
/* -------------------------------------------------------------------------- */

export default function CaliforniaDreams() {
  const [picked, setPicked] = useState<ProgramId | null>(null);

  return (
    <main className="cu-body bg-[var(--cu-cream)] text-[var(--cu-ink)] antialiased">
      <Hero />
      <FutureVision />
      <WhyCalifornia />
      <ProfileQuiz onResult={setPicked} />
      <ProgramsCards onPick={setPicked} />
      <WhatsIncluded />
      <UniversityPrograms />
      <EmotionalValue />
      <IfItWereYou />
      <Testimonials />
      <LeadForm preselected={picked} />
      <Footer />
    </main>
  );
}
